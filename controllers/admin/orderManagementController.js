const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const Address=require("../../models/addressSchema");
const Order=require("../../models/orderSchema");



const getAdminOrders = async (req, res) => {
    try {
      const searchQuery = req.query.search || '';
  
      const orders = await Order.find({
        $or: [
          { orderId: { $regex: searchQuery, $options: "i" } },
          { 'user.name': { $regex: searchQuery, $options: "i" } }
        ]
      })
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'productName'
      })
      .sort({ date: -1 })
      .exec();
  
      res.render("orders", {
        orders,
        search: searchQuery
      });
    } catch (error) {
      console.error("Error fetching orders: ", error);
      res.status(500).send("Server error");
    }
  };
  
 // Fetch order details
 const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;  
        const order = await Order.findById(orderId) 
            .populate('user')
            .populate({
              path: 'items.product',
              populate: {
                path: 'brand',
                select: 'name' 
              }
            })
            .exec();
            
        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        res.render('orderDetails', { order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};

  
  const updateOrderStatus= async (req, res) => {
    const { orderId, status } = req.body;
    try {
      await Order.findByIdAndUpdate(orderId, { status });
      res.redirect(`/orderDetails/${orderId}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).render('error', { message: 'Server error' });
    }
  };


  const updateItemStatus = async (req, res) => {
    const { orderId, itemId, itemStatus } = req.body;
    try {
        // Find the order and update the specific item's status
        await Order.findOneAndUpdate(
            { _id: orderId, 'items._id': itemId },
            { $set: { 'items.$.itemOrderStatus': itemStatus } }
        );
        
        // Redirect back to the order details page
        res.redirect(`/admin/orderDetails/${orderId}`);
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};


module.exports={
    getAdminOrders,
    getOrderDetails,
    updateOrderStatus,
    updateItemStatus,
}