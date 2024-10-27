const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const Product=require("../../models/productSchema");
const Cart=require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order=require("../../models/orderSchema");



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

        // Fetch all orders for the logged-in user, sorted by date (latest orders first)
        const userOrders = await Order.find({ user: userId })
            .populate('items.product')  // Populate product details
            .sort({ date: -1 });        // Sort orders by date (descending)

        if (!userOrders || userOrders.length === 0) {
            return res.status(404).json({ message: "No orders found" });
        }

        // Render the 'myOrders' EJS view with the orders data
        res.render('my-orders', { orders: userOrders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "An error occurred while fetching orders" });
    }
};


// Cancel Order
const cancelOrder = async (req, res) => {
    const { itemOrderId, reason } = req.body;
    console.log('Cancel request for itemOrderId:', itemOrderId);
    console.log('Cancellation reason:', reason);

    if (!itemOrderId || !reason) {
        return res.status(400).json({ success: false, message: 'ItemOrderId and reason are required' });
    }

    try {
        const order = await Order.findOne({ "items.itemOrderId": itemOrderId });
        console.log('Order found:', order);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.find(i => i.itemOrderId === itemOrderId);
        console.log('Item found:', item);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        // Update item status
        item.itemOrderStatus = 'Cancelled';
        item.cancelReason = reason;

        await order.save();

        res.status(200).json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Error cancelling order' });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findOne({ orderId })
            .populate('user', 'name')  // Populate user name
            .populate('items.product'); // Populate product details

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('order-details', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports={
    orderConfirmation,
    getMyOrders,
    cancelOrder,
    getOrderDetails,
}