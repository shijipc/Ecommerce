const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const Product=require("../../models/productSchema");
const Cart=require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order=require("../../models/orderSchema");
const Wallet =require("../../models/walletSchema")
const PDFDocument = require('pdfkit');
const razorpay = require('../../config/razorPay'); 
const fs = require('fs');


const orderConfirmation=async (req, res) => {
    try {
       return res.render('orderConfirmation');
    } catch (error) {
        console.error(error);
      }
}


const getMyOrders = async (req, res) => {
    try {
        const userId = req.session.userId || req.user;

        if (!userId) {
            console.error("User not logged in");
            return res.status(401).json({ error: "User not logged in" });
        }

        const { orderId } = req.query;

     
        const orderQuery = { user: userId };
        if (orderId) {
            orderQuery.orderId = orderId;
        }

        const userOrders = await Order.find(orderQuery)
            .populate('items.product')
            .sort({ date: -1 });

        if (!userOrders || userOrders.length === 0) {
            return res.status(404).json({ message: "No orders found" });
        }

        res.render('my-orders', { orders: userOrders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "An error occurred while fetching orders" });
    }
};


// Cancel Order

const cancelOrder = async (req, res) => {
    const { itemOrderId, reason } = req.body;

    if (!itemOrderId || !reason) {
        return res.status(400).json({ success: false, message: 'ItemOrderId and reason are required' });
    }

    try {
        const order = await Order.findOne({ "items.itemOrderId": itemOrderId }).populate('user');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const itemIndex = order.items.findIndex(item => item.itemOrderId === itemOrderId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        const paymentMethod = order.payment[0].method;
        const paymentStatus = order.payment[0].status;

        if (paymentMethod === "Online Payment" && paymentStatus === "pending") {
            // Cancel all items in the order and set the overall order status to "Cancelled"
            order.items.forEach(item => {
                item.itemOrderStatus = 'Cancelled';
                item.cancelReason = reason || "No reason provided";
            });
            order.status = "Cancelled";
        } else {
            // Cancel only the specific item if the payment conditions are not met
            order.items[itemIndex].itemOrderStatus = 'Cancelled';
            order.items[itemIndex].cancelReason = reason || "No reason provided";
        }
        
        await order.save();

        const { saledPrice, quantity} = order.items[itemIndex];
        console.log(saledPrice);
        if (!saledPrice || !quantity) {
            return res.status(400).json({ success: false, message: 'Invalid item price or quantity' });
        }    
        if ((paymentMethod === "Online Payment" || paymentMethod === "Wallet Payment") && paymentStatus === "completed") {
            if (order.user) {
                let wallet;
                if (order.user.wallet) {
                    wallet = await Wallet.findById(order.user.wallet);
                }

                if (!wallet) {
                    wallet = new Wallet({ balance: 0, transactions: [] });
                    await wallet.save();

                    order.user.wallet = wallet._id;
                    await order.user.save();
                }

               // Calculate discounted price if a coupon is applied
               let discountedPrice = 0;
               if (order.coupon && order.coupon?.discountValue && order.coupon.discountType === "Percentage") {
                   discountedPrice = (saledPrice * quantity) * (order.coupon.discountValue / 100);
               }

               // Calculate refund amount
               const itemTotal = saledPrice;
               const amountToCredit = itemTotal;
                console.log(itemTotal)
                
                wallet.balance += amountToCredit;
                wallet.transactions.push({
                    type: "credit",
                    amount: amountToCredit,
                    description: `Refund for cancelled order item: ${order.items[itemIndex].itemOrderId}`,
                    date: new Date()
                });

                await wallet.save();              
                order.items[itemIndex].itemOrderStatus = "Cancelled";

            } else {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
        }

        const productId = order.items[itemIndex].product._id.toString();
        await Product.findOneAndUpdate(
            { _id: productId, "sizes.size": order.items[itemIndex].size },
            { $inc: { "sizes.$.quantity": quantity } },
            { new: true }
        );

        // const allStatuses = order.items.map(item => item.itemOrderStatus);
        // order.status = [...new Set(allStatuses)].length === 1 ? allStatuses[0] : "Processing";

          // Check if all items in the order are cancelled
        if (order.items.every(item => item.itemOrderStatus === 'Cancelled')) {
            order.status = 'Cancelled';
        }
        
        await order.save();

        res.status(200).json({ success: true, message: 'Item Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Error cancelling order' });
    }
};


//returnorder

const returnOrder = async (req, res, next) => {
    try {
        const { itemOrderId, returnReason } = req.body;

       
        console.log("Received itemOrderId:", itemOrderId, "with returnReason:", returnReason);

        const order = await Order.findOne({ "items.itemOrderId": itemOrderId });
        console.log("Found order:", order); 

        if (!order) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const itemIndex = order.items.findIndex(item => item.itemOrderId === itemOrderId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in the order' });
        }

        const item = order.items[itemIndex];
        console.log("Item status:", item.itemOrderStatus); 

        if (item.itemOrderStatus !== 'Delivered') {
            return res.status(400).json({ message: 'Item is not eligible for return' });
        }

        const deliveryDate = item.deliveryDate || order.date; 
        console.log("Delivery Date:", deliveryDate); 
        const currentDate = new Date();
        const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));

        if (daysSinceDelivery > 7) {
            return res.status(400).json({ message: 'Return period has expired' });
        }

        item.itemOrderStatus = "Return Requested";
        item.returnReason = returnReason;

        await order.save().catch(err => {
            console.error("Error saving order:", err);
            return res.status(500).json({ message: "Error saving order, please try again." });
        });

        res.status(200).json({ message: 'Return request submitted successfully' });

    } catch (error) {
        console.error("Error in returnOrder:", error); 
        next(error);
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findOne({ orderId })
            .populate('user', 'name')  
            .populate('items.product') 
            .populate('coupon');       

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const coupon = order.coupon;
        let totalCouponDiscount = 0; 

        if (coupon) {
            order.items.forEach(item => {
                let discountValue = 0;

                // Calculate discount based on coupon type
                if (coupon.discountType === 'percentage') {
                    discountValue = (item.salePrice * coupon.discountValue) / 100; 
                }

                // Apply the discount to the sale price, ensuring it doesn't go below 0
                const discountedPrice = Math.max(0, item.salePrice - discountValue);
                item.discount = discountValue * item.quantity; 
                totalCouponDiscount += discountValue * item.quantity; 

                // Update item's sale price with the discounted price
                item.saledPrice = discountedPrice;
            });
        }

        // Store total discount in the order object
        order.discount = totalCouponDiscount;

        res.render('order-details', { 
            order, 
            couponCode: coupon ? coupon.code : null 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

//repayment
const confirmRePayment = async (req, res, next) => {
    console.log(req.body);
    console.log(req.params);
    try {
      const { orderId } = req.params;
      const { razorpayOrderId } = req.body;
      console.log('orderId:', orderId);
      console.log('razorpayOrderId:', razorpayOrderId);
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      // Find the pending payment entry
      const pendingPayment = order.payment.find(payment => payment.status === 'pending');
      if (!pendingPayment) {
        return res.status(400).json({ success: false, message: 'No pending payment for this order' });
      }
  
      let razorpayOrder;
      if (razorpayOrderId) {
        razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
        console.log('Razorpay Order:', razorpayOrder);
      } else {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(order.totalPrice * 100), 
          currency: 'INR',
          receipt: `order_rcptid_${order._id}`,
          payment_capture: 1
        });
  
        pendingPayment.razorpayOrderId = razorpayOrder.id;
        await order.save();
      }
  
      res.status(200).json({
        success: true,
        amount: razorpayOrder.amount,
        razorpayOrderId: razorpayOrder.id
      });
  
    } catch (error) {
      console.error('Error in confirmRePayment:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  };


  const downloadInvoice = async (req, res, next) => {
    try {
        const itemId = req.params.itemId;
        const userId = req.user && req.user._id;

        console.log("itemId:", itemId);
        console.log("userId:", userId);

        const order = await Order.findOne({
            "items.itemOrderId": itemId,
            user: userId,
        }).populate("items.product")
          .populate('coupon');  

        if (!order) {
            console.error("Order not found");
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const coupon = order.coupon; // Check if coupon exists
        console.log(`coupon._id: ${coupon ? coupon._id : "No coupon applied"}`);

        let totalCouponDiscount = 0; 

        if (coupon) {
            order.items.forEach((item) => {
                // Only process the item if its order status is "Delivered"
                if (item.itemOrderStatus === "Delivered") {
                    let discountValue = 0;

                    if (coupon.discountType === "percentage") {
                        discountValue = (item.salePrice * coupon.discountValue) / 100;
                        console.log(`discountValue: ${discountValue}`);
                    }

                    const discountedPrice = Math.max(0, item.salePrice - discountValue);

                    item.discount = discountValue * item.quantity;
                    console.log(`item discount: ${item.discount}`);

                    totalCouponDiscount += discountValue * item.quantity;
                    console.log(`totalCouponDiscount: ${totalCouponDiscount}`);

                    item.saledPrice = discountedPrice;
                }
            });
        }
        
        // Fetch user data
        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Find the specific item in the order where the status is "Delivered"
        const item = order.items.find((i) => i.itemOrderId === itemId && i.itemOrderStatus === "Delivered");
        if (!item) {
            console.error("Delivered item not found in order");
            return res.status(404).json({ success: false, message: "Delivered item not found in the order" });
        }

        // Initialize PDF Document
        const doc = new PDFDocument();
        res.setHeader("Content-Disposition", `attachment; filename=Invoice_${order.orderId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        // Generate Invoice Header
        doc.fontSize(20).text("INVOICE", { align: "center" }).moveDown(1);
        doc.fontSize(12)
            .text(`Order ID: ${order.orderId}`, { align: "right" })
            .text(`Order Date: ${new Date(order.date).toLocaleDateString()}`, { align: "right" })
            .text(`Invoice Date: ${new Date(order.invoice.invoiceDate).toLocaleDateString()}`, { align: "right" })
            .moveDown(1);

        // Seller Information
        const leftColumnX = 50;
        let startY = doc.y;
        doc.fontSize(12).text("Sold by", leftColumnX, startY, { underline: true });
        doc.text("Shoe Mart", leftColumnX, startY + 15);
        doc.text("No 6, ABC Complex, Thrissur, Kerala", leftColumnX, startY + 30);
        doc.text("Pin: 680580", leftColumnX, startY + 45);

        // Customer Address
        doc.moveDown(2);
        const { house, place, city, state, pin, contactNo } = order.address;
        doc.text("Billing Address:").text(`${house || ""}, ${place || ""}`)
           .text(`${city || ""}, ${state || ""}`)
           .text(`Pin: ${pin || ""}`).text(`Contact: ${contactNo || ""}`).moveDown(1);

        startY = doc.y;

        // Line Item Headers
        const headers = ["Item", "Size", "Quantity", "Unit Price", "Discount", "Total"];
        const columnWidths = [180, 60, 60, 80, 80, 80];
        const rowHeight = 30;

        let tableStartX = 50;

        // Draw table headers
        headers.forEach((header, i) => {
            doc.rect(tableStartX, startY, columnWidths[i], rowHeight).stroke();
            doc.fontSize(10).text(header, tableStartX + 5, startY + 5, { width: columnWidths[i], align: "center" });
            tableStartX += columnWidths[i];
        });

        startY += rowHeight;

        // Total calculations
        let totalItemPrice = 0;
        let totalItemDiscount = 0;

        // Generate Line Items
        order.items.forEach((item) => {
            // Only process items with status "Delivered"
            if (item.itemOrderStatus === "Delivered") {
                const { regularPrice, salePrice, saledPrice, quantity, product } = item;

                const itemDiscount = (regularPrice - salePrice) * quantity;
                const itemTotalPrice = (saledPrice > 0 ? saledPrice : (salePrice * quantity));

                totalItemPrice += itemTotalPrice;
                totalItemDiscount += itemDiscount;

                const discountText = `Rs. ${itemDiscount.toFixed(2)}\nRs. ${item.discount ? item.discount.toFixed(2) : 0}`;

                const row = [
                    product.productName,
                    item.size,
                    quantity,
                    `Rs. ${regularPrice.toFixed(2)}`,
                    discountText,
                    `Rs. ${itemTotalPrice.toFixed(2)}`,
                ];

                tableStartX = 50; // Reset X for the row
                row.forEach((text, i) => {
                    doc.rect(tableStartX, startY, columnWidths[i], rowHeight).stroke();
                    doc.fontSize(10).text(text, tableStartX + 5, startY + 5, { width: columnWidths[i], align: "center", ellipsis: true });
                    tableStartX += columnWidths[i];
                });

                startY += rowHeight;
            }
        });

        // Invoice Summary
        doc.moveDown(1);
        const { totalPrice, discount = 0 } = order;
        const rightAlignX = 395;
        const labelWidth = 150;

        // Coupon Discount
        doc.fontSize(12)
            .text(`Coupon Disc: Rs.${coupon ? order.discount : 0}`, rightAlignX, startY + 15, { width: labelWidth, align: "right" })
            .moveDown(0.5);

        // Total Price
        doc.text(`Grand Total: Rs.${(totalItemPrice).toFixed(2)}`, rightAlignX, startY + 30, { width: labelWidth, align: "right" });

        doc.moveDown(2);

        // Footer
        doc.fontSize(10).text("Thank you for your purchase!", { align: "center" });

        doc.end();
    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        res.status(500).json({ success: false, message: "Error generating invoice" });
    }
};

module.exports={
    orderConfirmation,
    getMyOrders,
    cancelOrder,
    returnOrder,
    getOrderDetails,
    confirmRePayment,
    downloadInvoice,
}