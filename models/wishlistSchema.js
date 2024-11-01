const mongoose=require("mongoose");
const {Schema}=mongoose;

const wishlistSchema=new Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    products:[
        {
        productsId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        size: {
            type: String,
            required: false,
          },
          quantity: {
            type: Number,
            required: false,
          },
        addedOn:{
            type:Date,
            default:Date.now
        }
    }
]
})

const Wishlist=mongoose.model('Wishlist',wishlistSchema);

module.exports=Wishlist;
