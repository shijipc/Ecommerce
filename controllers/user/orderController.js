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

        const { saledPrice, quantity } = order.items[itemIndex];
        if (!saledPrice || !quantity) {
            return res.status(400).json({ success: false, message: 'Invalid item price or quantity' });
        }

        const amountToCredit = saledPrice * quantity;

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

                wallet.balance += amountToCredit;
                wallet.transactions.push({
                    type: "credit",
                    amount: amountToCredit,
                    description: `Refund for cancelled order item: ${itemOrderId}`,
                    date: new Date()
                });

                await wallet.save();
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

        const allStatuses = order.items.map(item => item.itemOrderStatus);
        order.status = [...new Set(allStatuses)].length === 1 ? allStatuses[0] : "Processing";

        await order.save();

        res.status(200).json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Error cancelling order' });
    }
};

// const cancelOrder = async (req, res) => {
//     const { itemOrderId, reason } = req.body;

//     if (!itemOrderId || !reason) {
//         return res.status(400).json({ success: false, message: 'ItemOrderId and reason are required' });
//     }

//     try {
//         const order = await Order.findOne({ "items.itemOrderId": itemOrderId }).populate('user');
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         const itemIndex = order.items.findIndex(item => item.itemOrderId === itemOrderId);
//         if (itemIndex === -1) {
//             return res.status(404).json({ success: false, message: 'Item not found in order' });
//         }

//         // Update item status and reason
//         order.items[itemIndex].itemOrderStatus = 'Cancelled';
//         order.items[itemIndex].cancelReason = reason || "No reason provided";

//         const { saledPrice, quantity } = order.items[itemIndex];
//         if (!saledPrice || !quantity) {
//             return res.status(400).json({ success: false, message: 'Invalid item price or quantity' });
//         }

//         const amountToCredit = saledPrice * quantity;
//         const paymentMethod = order.payment[0].method;
//         const paymentStatus = order.payment[0].status;

//         if ((paymentMethod === "Online Payment" || paymentMethod === "Wallet Payment") && paymentStatus === "completed") {
//             if (order.user) {
//                 let wallet;
//                 if (order.user.wallet) {
//                     wallet = await Wallet.findById(order.user.wallet);
//                 }
           
               
//                 if (!wallet) {
//                     console.log("No existing wallet found. Creating a new wallet.");
//                     wallet = new Wallet({ balance: 0, transactions: [] });
//                     await wallet.save();
                    
//                     order.user.wallet = wallet._id;
//                     await order.user.save();
//                     console.log("New wallet created and assigned to user:", wallet._id);
//                 }

//                 wallet.balance += amountToCredit;
//                 wallet.transactions.push({
//                     type: "credit",
//                     amount: amountToCredit,
//                     description: `Refund for cancelled order item: ${itemOrderId}`,
//                     date: new Date()
//                 });

//                 await wallet.save();

//                 console.log("Updated wallet balance:", wallet.balance);
//                 console.log("Added transaction:", wallet.transactions[wallet.transactions.length - 1]);
//             } else {
//                 console.error('User not found in the order.');
//                 return res.status(404).json({ success: false, message: 'User not found' });
//             }
//         }

//         const productId = order.items[itemIndex].product._id.toString();
//         await Product.findOneAndUpdate(
//             { _id: productId, "sizes.size": order.items[itemIndex].size },
//             { $inc: { "sizes.$.quantity": quantity } },
//             { new: true }
//         );

//         const allStatuses = order.items.map(item => item.itemOrderStatus);
//         order.status = [...new Set(allStatuses)].length === 1 ? allStatuses[0] : "Processing";

//         await order.save();

//         res.status(200).json({ success: true, message: 'Order cancelled successfully' });
//     } catch (error) {
//         console.error('Error cancelling order:', error);
//         res.status(500).json({ success: false, message: 'Error cancelling order' });
//     }
// };


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
            .populate('items.product'); 

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('order-details', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


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
    const orderId = req.params.orderId;

    const order = await Order.findOne({ orderId })
      .populate('user', 'name')
      .populate('items.product');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.invoice.invoiceNo}.pdf`);
      res.send(pdfData);
    });

    // Header and basic details
    doc.fontSize(16).text('Tax Invoice', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10);

    // Seller details
    const leftColumnX = 50;
    const startY = 110;
    doc.text('Sold by', leftColumnX, startY, { underline: true });
    doc.text('Shoe Mart', leftColumnX, startY + 15);
    doc.text('No 6, ABC Complex,Thrissur, Kerala', leftColumnX, startY + 30);
    doc.text('Pin: 680580', leftColumnX, startY + 45);

    // Order and Invoice details
    const rightColumnX = 400;
    doc.text(`Order Id: ${order.orderId}`, rightColumnX, startY);
    doc.text(`Invoice No: ${order.invoice.invoiceNo}`, rightColumnX, startY + 15);
    doc.text(`Order Date: ${order.date.toLocaleDateString()}`, rightColumnX, startY + 30);
    doc.text(`Invoice Date: ${order.invoice.invoiceDate.toLocaleDateString()}`, rightColumnX, startY + 45);

    // Shipping Address
    const shippingAddressStartY = startY + 80;
    doc.text('Shipping Address:', leftColumnX, shippingAddressStartY, { underline: true });
    doc.text(`${order.user.name}`, leftColumnX, shippingAddressStartY + 15);
    doc.text(`${order.address.house}, ${order.address.place}`, leftColumnX, shippingAddressStartY + 30);
    doc.text(`${order.address.city}, ${order.address.state} - ${order.address.pin}`, leftColumnX, shippingAddressStartY + 45);
    doc.text(`Phone: ${order.address.contactNo}`, leftColumnX, shippingAddressStartY + 60);

    // Table headers for product details
    const tableTop = 300;
    const columnX = [50, 150, 250, 320, 390, 460];
    const columnWidths = [150, 100, 50, 70, 70, 70]; 
    const rowHeight = 20;

    doc.fontSize(9).font('Helvetica-Bold');

    // Header Row
    doc.text('Name', columnX[0], tableTop, { width: columnWidths[0], align: 'left' });
    doc.text('Brand', columnX[1], tableTop, { width: columnWidths[1], align: 'right' });
    doc.text('Qty', columnX[2], tableTop, { width: columnWidths[2], align: 'right' });
    doc.text('Amount', columnX[3], tableTop, { width: columnWidths[3], align: 'right' });
    doc.text('Discount', columnX[4], tableTop, { width: columnWidths[4], align: 'right' });
    doc.text('Total', columnX[5], tableTop, { width: columnWidths[5], align: 'right' });

    // Draw header row line
    doc.moveTo(columnX[0], tableTop + rowHeight).lineTo(columnX[5] + columnWidths[5], tableTop + rowHeight).stroke();

    // Product Rows
    doc.font('Helvetica');
    let yPosition = tableTop + rowHeight;

    order.items.forEach(item => {
      yPosition += rowHeight;

      // Multi-line product name with ellipsis
      doc.text(item.product.productName, columnX[0], yPosition, {
        width: columnWidths[0],
        align: 'left',
        ellipsis: true,
        lineBreak: true
      }); doc.text(item.product.brand, columnX[1], yPosition, { width: columnWidths[1], align: 'right' });
      doc.text(item.quantity.toString(), columnX[2], yPosition, { width: columnWidths[2], align: 'right' });
      doc.text(item.regularPrice.toFixed(2), columnX[3], yPosition, { width: columnWidths[3], align: 'right' });
      doc.text((item.regularPrice - item.saledPrice).toFixed(2), columnX[4], yPosition, { width: columnWidths[4], align: 'right' });
      doc.text((item.saledPrice * item.quantity).toFixed(2), columnX[5], yPosition, { width: columnWidths[5], align: 'right' });

      // Draw line under each product row
      doc.moveTo(columnX[0], yPosition + rowHeight).lineTo(columnX[5] + columnWidths[5], yPosition + rowHeight).stroke();
    });

    doc.end();
  } catch (error) {
    next(error);
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