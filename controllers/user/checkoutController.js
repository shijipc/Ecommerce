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
        // let subtotal = 0;
        // cartData.items.forEach(item => {
        //     item.totalPrice = item.product.salePrice * item.quantity;
            
        //     subtotal += item.product.salePrice * item.quantity;
        // });
        let totalPrice = 0;
        let totalDiscount = 0;
        const shippingCost = 0; 
        let cartUpdated = false; 

          
          const coupons = await Coupon.find({ status: "Active" }); 
          
          cartData.items.forEach(item => {
            const product = item.product;
    
        
            const price =
              product.offerPrice && product.offerPrice < product.salePrice
                ? product.offerPrice
                : product.salePrice < product.regularPrice
                ? product.salePrice
                : product.regularPrice;
    
            const discountAmount =
              product.offerPrice && product.offerPrice < product.regularPrice
                ? product.regularPrice - product.offerPrice
                : product.salePrice < product.regularPrice
                ? product.regularPrice - product.salePrice
                : 0;
    
            
            if (item.price !== price || item.discountAmount !== discountAmount) {
              item.price = price;
              item.discountAmount = discountAmount;
              item.regularPrice = product.regularPrice;
              cartUpdated = true; 
            }
    
           totalPrice += product.regularPrice * item.quantity;
            totalDiscount += discountAmount * item.quantity;
          });
    
          const subtotal = totalPrice - totalDiscount 
             const orderTotal = subtotal + shippingCost;
    
          
          if (cartUpdated) {
            await cartData.save();
          }


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
        const { couponId } = req.body; 
        const userId = req.session.user || req.user;
        const cart = await Cart.findOne({ userId: userId }).populate('items.product').exec();
    
        if (!cart || !cart.items || cart.items.length === 0) {
          return res.status(400).json({ message: "Your cart is empty" });
        }
    
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
          return res.status(404).json({ message: "Coupon not found" });
        }
    
      
        const today = new Date();
        if (today > coupon.endDate) {
          return res.status(400).json({ message: "Coupon has expired" });
        }
    
      
        const usedCoupon = await Order.findOne({ user: userId, coupon: couponId });
        if (usedCoupon) {
          return res.status(400).json({ message: "Coupon has already been used. Please try another one." });
        }
    
        let totalPrice = 0;
        let totalDiscount = 0;
    
        cart.items.forEach(item => {
          totalPrice += item.product.regularPrice * item.quantity;
          totalDiscount += item.discountAmount * item.quantity; 
        });
    
       
        const netAmount = totalPrice - totalDiscount;
    
    
    
        if (netAmount < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount is ${coupon.minPurchaseAmount} for this coupon.` });
          }
          
          if (netAmount > coupon.maxPurchaseAmount) {
            return res.status(400).json({ message: `Maximum purchase amount is ${coupon.maxPurchaseAmount} for this coupon.` });
          }
     
        const shippingCost = 0;
        let discountAmount = 0;
        if (coupon.discountType === "fixed") {
            discountAmount = coupon.discountValue;
          } else if (coupon.discountType === "percentage") {
            discountAmount = (netAmount * coupon.discountValue) / 100;
          }
          
        discountAmount = Math.min(discountAmount, (totalPrice - totalDiscount));
        console.log(discountAmount);
        
    
        totalDiscount += discountAmount;
    
        
       let orderTotal = totalPrice - totalDiscount +shippingCost;
    
       
        req.session.appliedCoupon = couponId;
    
        
        res.status(200).json({
          totalPrice: totalPrice.toFixed(2),
          discount: totalDiscount.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          orderTotal: orderTotal.toFixed(2),
          discountAmount:discountAmount.toFixed(2),
          couponCode: coupon.code,
          couponId: coupon._id
        });
    
      } catch (error) {
        console.error('Error in addCoupon:', error);
        res.status(500).json({ message: "An error occurred while applying the coupon" });
        next(error);
      }
    };
    

// Helper functions
const calculateCouponDiscount = (coupon, totalPrice) => {
    if (!coupon) return 0;
    
    if (coupon.discountType === 'percentage') {
        const discount = (totalPrice * coupon.discountValue) / 100;
        return Math.min(discount, coupon.maxDiscount || Infinity); // Apply max discount if specified
    }
    return Math.min(coupon.discountValue, totalPrice); // Fixed amount discount
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId || req.session.user || req.user;
        if (!userId) {
            return res.status(401).json({ error: "User not logged in" });
        }

        const { addressId, paymentMethod, cartId, appliedCouponId } = req.body;

        // Validate required fields
        if (!addressId) {
            return res.status(400).json({ error: "Please select a delivery address" });
        }

        if (!paymentMethod) {
            return res.status(400).json({ error: "Please select a payment method" });
        }

        // Validate address
        const selectedAddress = await Address.findById(addressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: "Invalid address selected" });
        }

        // Validate payment method
        if (!['Online Payment', 'Cash On Delivery', 'WalletPayment'].includes(paymentMethod)) {
            return res.status(400).json({ error: 'Invalid payment method selected' });
        }

        // Get cart with populated products
        const cart = await Cart.findOne({ _id: cartId, userId })
            .populate('items.product');
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "No items in cart" });
        }

        // Calculate prices and prepare items
        let totalPrice = 0;
        let actualPrice = 0; 
        let discountAmount = 0;
        const preparedItems = [];

        // Process each cart item with its size and quantity
        for (const item of cart.items) {
            // Calculate actual price based on regular price
            actualPrice += item.product.regularPrice * item.quantity;

            let itemPrice;
            if (item.product.offerPrice && item.product.offerPrice < item.product.regularPrice) {
                itemPrice = item.product.offerPrice;
            } else if (item.product.salePrice < item.product.regularPrice) {
                itemPrice = item.product.salePrice;
            } else {
                itemPrice = item.product.regularPrice;
            }

            const itemTotal = itemPrice * item.quantity;
            totalPrice += itemTotal;

            preparedItems.push({
                product: item.product._id,
                quantity: item.quantity,
                size: item.size,
                regularPrice: item.product.regularPrice,
                salePrice: itemPrice,
                saledPrice: itemTotal
            });
        }

        // Apply coupon if present
        let finalTotal = totalPrice;
        let appliedCoupon = null;
        
        if (appliedCouponId) {
            appliedCoupon = await Coupon.findById(appliedCouponId);
            if (appliedCoupon && appliedCoupon.status !== "Not available") {
                discountAmount = calculateCouponDiscount(appliedCoupon, totalPrice);
                finalTotal = totalPrice - discountAmount;
            }
        }

        // Create order
        const orderData = {
            user: userId,
            address: {
                house: selectedAddress.house,
                place: selectedAddress.place,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pin: selectedAddress.pin,
                contactNo: selectedAddress.contactNo,
                landMark: selectedAddress.landMark || ''
            },
            items: preparedItems,
            actualPrice: actualPrice, // Using the new actualPrice instead of totalPrice
            saledPrice: finalTotal,
            offerPrice: finalTotal,
            coupon: appliedCouponId || undefined,
            discount: discountAmount,
            status: 'Processing',
            payment: [{
                method: paymentMethod,
                status: 'pending'
            }],
            totalPrice: finalTotal,
            orderType: 'Retail',
            shippingMethod: 'Standard'
        };

        const order = new Order(orderData);
        await order.save();

        // Clear cart
        await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

        // Handle payment methods
        if (paymentMethod === "Online Payment") {
            const razorpayOptions = {
                amount: Math.round(finalTotal * 100),
                currency: "INR",
                receipt: `order_rcptid_${order._id}`
            };

            const razorpayOrder = await razorpayInstance.orders.create(razorpayOptions);
            
            order.payment[0].razorpayOrderId = razorpayOrder.id;
            await order.save();

            return res.status(200).json({
                success: true,
                redirectToRazorpay: true,
                orderId: order._id,
                razorpayOrderId: razorpayOrder.id,
                amount: finalTotal
            });

        } else if (paymentMethod === "WalletPayment") {
            const wallet = await Wallet.findOne({ user: userId });
            
            if (!wallet || wallet.balance < finalTotal) {
                return res.status(400).json({ error: "Insufficient wallet balance" });
            }

            wallet.balance -= finalTotal;
            await wallet.save();

            order.payment[0].status = "completed";
            await order.save();

            return res.status(200).json({
                success: true,
                orderId: order._id,
                redirectTo: '/user/order-confirmation'
            });

        } else {
            // Cash On Delivery
            return res.status(200).json({
                success: true,
                orderId: order._id,
                redirectTo: '/user/order-confirmation'
            });
        }

    } catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({ 
            error: error.message || "An error occurred while placing the order" 
        });
    }
};

module.exports={
    getCheckout,
    applyCoupon,
    placeOrder,
}