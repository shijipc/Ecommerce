const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const Product=require("../../models/productSchema");
const Cart=require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order=require("../../models/orderSchema");
const Coupon=require("../../models/couponSchema");




const getCheckout = async (req, res) => {
    try {
        const cartId = req.params.id;
        
        const cartData = await Cart.findOne({ _id: cartId })
            .populate('items.product')
            .populate('userId');
        
        if (!cartData) {
            return res.status(404).send('Cart not found');
        }

        const userId = cartData.userId._id;

        const userWithAddresses = await User.findById(userId).populate('address');
        const userAddresses = userWithAddresses.address;

        // Calculate totals
        let subtotal = 0;
        cartData.items.forEach(item => {
            item.totalPrice = item.product.salePrice * item.quantity;
            subtotal += item.product.salePrice * item.quantity;
        });

        const shippingCost = 0; 
        const orderTotal = subtotal + shippingCost;

          
          const coupons = await Coupon.find({ status: "Active" }); 


        res.render('checkout', { 
            addresses: userAddresses,            
            firstName: cartData.userId.firstName,
            cartData,
            subtotal,
            shippingCost,
            orderTotal,
            coupons  
        });
    } catch (error) {
        console.error("Error during checkout page load:", error);
        res.status(500).send('An error occurred while loading the checkout page');
    }
};



const applyCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        const cart = await Cart.findById(req.body.cartId).populate('items.product');

        const coupon = await Coupon.findOne({ code, status: 'Active' });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }

        const cartTotal = cart.items.reduce((sum, item) => sum + (item.product.salePrice * item.quantity), 0);
        let discount = 0;

        if (coupon.discountType === 'Percentage') {
            discount = (cartTotal * coupon.discountValue) / 100;
        } else {
            discount = coupon.discountValue;
        }

        const newTotal = cartTotal - discount;

        res.json({ success: true, discount, newTotal });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    }
}


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId || req.session.user || req.user;
        // Check if the user is logged in
        if (!userId) {
            console.error("User not logged in");
            return res.status(401).json({ error: "User not logged in" });
        }

        const { addressId, paymentMethod, cartId,appliedCoupon } = req.body;

       
        console.log('Received order data:', { userId, addressId, paymentMethod, cartId });

        // Validate if the address exists
        const selectedAddress = await Address.findById(addressId);
        if (!selectedAddress) {
            console.error("Invalid address selected");
            return res.status(400).json({ error: "Invalid address selected" });
        }
        console.log('Selected address:', selectedAddress);

        // Validate the cart
        const cart = await Cart.findOne({ _id: cartId, userId: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            console.error("No items in cart");
            return res.status(400).json({ error: "No items in cart" });
        }
        console.log('Cart details:', cart);

        // Calculate total price
        const totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        if (appliedCoupon) {
            const coupon = await Coupon.findOne({ code: appliedCoupon });
            if (coupon) {
                totalPrice -= coupon.discountValue; 
            }
        }

        const shippingCost = 0; 
        const finalAmount = totalPrice + shippingCost;
        console.log('Total price:', totalPrice, 'Final amount:', finalAmount);

        // Create a new order
        const newOrder = new Order({
            user: userId,
            address: {
                house: selectedAddress.house,
                place: selectedAddress.place,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pin: selectedAddress.pin,
                contactNo: selectedAddress.contactNo,
                landMark: selectedAddress.landMark || '',
            },
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                regularPrice: item.product.regularPrice,
                salePrice: item.price,
                saledPrice: item.price * item.quantity,
            })),
            actualPrice: totalPrice,
            offerPrice: finalAmount,
            discount: 0, 
            status: 'Processing',
            payment: [{
                method: paymentMethod,
                status: paymentMethod === 'Cash On Delivery' ? 'pending' : 'completed'
            }],
            totalPrice: finalAmount,
            orderType: 'Retail', 
            shippingMethod: 'Standard', 
        });

        console.log('New order data:', newOrder);

        const savedOrder = await newOrder.save();
        console.log('Order saved successfully:', savedOrder);

        // Clear the user's cart
        await Cart.findByIdAndUpdate(cartId, { items: [] });
        console.log('Cart cleared');

        // Send response
        res.status(200).json({ 
            message: "Order placed successfully", 
            orderId: savedOrder._id 
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ error: "An error occurred while placing the order" });
    }
};




module.exports={
    getCheckout,
    applyCoupon,
    placeOrder

}