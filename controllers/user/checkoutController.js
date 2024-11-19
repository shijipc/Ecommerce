const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const Wallet=require("../../models/walletSchema");
const Product=require("../../models/productSchema");
const Cart=require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order=require("../../models/orderSchema");
const Coupon=require("../../models/couponSchema");
const razorpay = require('../../config/razorPay'); 




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


    const removeCoupon = async (req, res, next) => {
        try {
          const userId = req.session.user || req.user;
                   
          const cart = await Cart.findOne({ userId: userId }).populate('items.product').exec();
      
          if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
          }
      
          
          req.session.appliedCoupon = null;
      
          let totalPrice = 0;
          let totalDiscount = 0;
      
          
          cart.items.forEach(item => {
            totalPrice += item.product.regularPrice * item.quantity;
            totalDiscount += item.discountAmount * item.quantity; 
          });
      
          const platformFee = 0;
          const deliveryCharges = 0;
          const finalTotal = totalPrice - totalDiscount + platformFee + deliveryCharges;
      
          res.status(200).json({
            totalPrice: totalPrice.toFixed(2),
            discount: totalDiscount.toFixed(2), 
            platformFee: platformFee.toFixed(2),
            deliveryCharges: deliveryCharges.toFixed(2),
            finalTotal: finalTotal.toFixed(2),
          });
      
        } catch (error) {
          console.error('Error in removeCoupon:', error);
          res.status(500).json({ message: "An error occurred while removing the coupon" });
          next(error);
        }
      };
    

// Helper functions
const calculateCouponDiscount = (coupon, totalPrice) => {
    if (!coupon) return 0;
    
    if (coupon.discountType === 'percentage') {
        const discount = (totalPrice * coupon.discountValue) / 100;
        return Math.min(discount, coupon.maxDiscount || Infinity); 
    }
    return Math.min(coupon.discountValue, totalPrice); 
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

        let totalPrice = 0;
        let actualPrice = 0;
        const preparedItems = [];

        // Calculate total and item-wise details
        for (const item of cart.items) {
            actualPrice += item.product.regularPrice * item.quantity;

            let itemPrice = item.product.salePrice || item.product.regularPrice;
            totalPrice += itemPrice * item.quantity;

            preparedItems.push({
                product: item.product._id,
                quantity: item.quantity,
                size: item.size,
                regularPrice: item.product.regularPrice,
                salePrice: itemPrice,
                saledPrice: itemPrice * item.quantity, // Temporarily storing before discount
                itemCouponDiscount: 0 // Placeholder for individual item discount
            });
        }

        let finalTotal = totalPrice;
        let discountAmount = 0;

        if (appliedCouponId) {
            const appliedCoupon = await Coupon.findById(appliedCouponId);
            if (appliedCoupon && appliedCoupon.status !== "Not available") {
                discountAmount = calculateCouponDiscount(appliedCoupon, totalPrice);
                finalTotal = totalPrice - discountAmount;

                // Distribute discount proportionally among items
                preparedItems.forEach(item => {
                    const itemShare = (item.saledPrice / totalPrice); // Proportional share
                    const itemDiscount = discountAmount * itemShare;
                    item.saledPrice -= itemDiscount; // Adjust final saled price
                    item.itemCouponDiscount = itemDiscount; // Store discount for the item
                });
            }
        }

          // Check if Cash On Delivery is allowed for this order
          if (paymentMethod === "Cash On Delivery" && finalTotal > 1000) {
            return res.status(400).json({ error: "Cash on Delivery is not available for orders above Rs 1000" });
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
            actualPrice: actualPrice,
            saledPrice: finalTotal,
            offerPrice: totalPrice,
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

            const razorpayOrder = await razorpay.orders.create(razorpayOptions);
            
            order.payment[0].razorpayOrderId = razorpayOrder.id;
            await order.save();

            return res.status(200).json({
                success: true,
                orderId: order._id,
                razorpayOrder: {
                    id: razorpayOrder.id,
                    amount: finalTotal,
                    currency: "INR",
                    key: process.env.RAZORPAY_KEY_ID
                }
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

//  verify payment
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        
        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Update order status
            const order = await Order.findOne({ "payment.razorpayOrderId": razorpay_order_id });
            if (order) {
                order.payment[0].status = "completed";
                order.payment[0].paymentId = razorpay_payment_id;
                await order.save();
                return res.status(200).json({ success: true, orderId: order._id });
            }
        }
        
        return res.status(400).json({ error: "Payment verification failed" });
    } catch (error) {
        console.error("Payment verification error:", error);
        return res.status(500).json({ error: "Payment verification failed" });
    }
};

module.exports={
    getCheckout,
    applyCoupon,
    removeCoupon,
    placeOrder,
    verifyPayment,
}