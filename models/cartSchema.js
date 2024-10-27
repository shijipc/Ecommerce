const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type:mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        product: {  
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",  
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        size:{
           type:String,
           required:true
        },
        price: {
            type: Number,
            required: true
        },
        discountAmount:{
            type: Number,
            required:false,
            default:0
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;