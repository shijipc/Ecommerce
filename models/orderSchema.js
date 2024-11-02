const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    default: () => uuidv4().split('-')[0],
    unique: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  address: {
    house: {
      type: String,
      required: true
    },
    place: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    landMark: {
      type: String,
      required: false  
    },
    pin: {
      type: Number,
      required: true
    },
    contactNo: {
      type: String,  
      required: true
    }
  },
  coupon: {
    type: Schema.Types.ObjectId,
    ref:'Coupon',
    required:false
  },
  items: [{
    itemOrderId: {
      type: String,
      default: () => uuidv4().split('-')[0],
      unique: true
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    size:{
      type:Number,
      required:true
  },
    quantity: {
      type: Number,
      required: true
    },
    regularPrice: {
      type: Number,
      default: 0
    },
    salePrice: {
      type: Number,
      default: 0
    },
    saledPrice: {
      type: Number,
      default: 0
    },
    itemOrderStatus: {
      type: String,
      required: false,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Requested","Return Approved","Return Rejected","Returned"],
       default: "Pending"
    },
    cancelReason: {
      type: String
    },
    returnRequestedReason: {
      type: String
    },
    returnRejectedReason: {
      type: String
    },
    deliveryDate: {
      type: Date
    },
    returnReason: {
      type: String
    }
  }],
  actualPrice: {
    type: Number,
    required: false
  },
  offerPrice: {
    type: Number,
    required: false
  },
  discount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Requested","Return Approved","Return Rejected","Returned","Completed"],
    default: "Pending"
},
  date: {
    type: Date,
    default: Date.now,
    required: false
  },
  payment: [{
    method: {
      type: String,
      required: true,
      enum: ["Cash On Delivery", "Online Payment", "Wallet Payment"]
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed"]
    },
    razorpayOrderId: {
      type: String,
      required: false  
    }
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  orderType: {
    type: String,
    enum: ["Retail", "Wholesale", "Subscription"]
  },
  shippingMethod: {
    type: String,
    enum: ["Standard", "Express", "Free Shipping"]
  },
  trackingNumber: {
    type: String
  },
  cancelReason: {
    type: String
  }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;