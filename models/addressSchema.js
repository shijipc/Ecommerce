const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
house:{
    type: String,
    required :true
},
place: {
    type:String,
    required : true
},
city: {
    type: String,
    required: true
},
state: {
    type: String,
    required: true
},
landMark:{
    type: String,
    required: false
},
pin:{
    type: Number,
    required: true
},
contactNo:{
    type: Number,
    required:true
},
isDeliveryAddress: {
    type:Boolean,
    required:false
}
})


const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
