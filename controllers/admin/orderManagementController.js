const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const Address=require("../../models/addressSchema");
const Order=require("../../models/orderSchema");



const getAdminOrders = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1; // Current page number, default is 1
    const limit = 5; // Number of orders per page
    const skip = (page - 1) * limit; // Number of orders to skip

    const totalOrders = await Order.countDocuments({
      $or: [
        { orderId: { $regex: searchQuery, $options: "i" } },
        { 'user.name': { $regex: searchQuery, $options: "i" } }
      ]
    });

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
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("orders", {
      orders,
      search: searchQuery,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error("Error fetching orders: ", error);
    return res.redirect("/pageerror");
    // res.status(500).send("Server error");
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
        
       
        res.redirect(`/admin/orderDetails/${orderId}`);
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};

const getReturnOrders = async (req, res) => {
  try {
    const orders = await Order.find({"items.itemOrderStatus": "Return Requested"  }).populate("user").populate("items.product");
    console.log("Fetched Orders:", orders);
    res.render("return-orders", { orders });
  } catch (error) {
    console.error("Error fetching requested orders:", error);
    return res.redirect("/pageerror");
    // res.status(500).send("Internal Server Error");
  }
};



module.exports={
    getAdminOrders,
    getOrderDetails,
    updateOrderStatus,
    updateItemStatus,
    getReturnOrders,
 }