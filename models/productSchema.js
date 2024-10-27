const mongoose=require("mongoose");
const {Schema}=mongoose;
const {v4:uuidv4} = require("uuid");
const mongoosePaginate = require('mongoose-paginate-v2'); 

const productSchema=new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    skuNumber: {  
        type:String,
        default: ()=>uuidv4(),
        unique:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        required:true
    },
    offerPrice:{
        type:Number,
        default:0
    },
    color:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of stock","Discounted"],
        required:true,
        default:"Available"
    },  
    sizes: {
        type: [{
            size: { type: String, required: true },
            quantity: { type: Number, required: true }
        }],
        required: true
    },
      ratings: {
        type: Number,
        min: 0,
        max: 5,
        default: 0, 
      },   
},{timestamps:true});

productSchema.plugin(mongoosePaginate);

const Product=mongoose.model("Product",productSchema);

module.exports=Product;

