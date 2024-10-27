import mongoose from "mongoose";
const variantSchema = mongoose.Schema(
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      stock: {
        type: Number,
        required: true,
      },
    },
    { timestamps: true }
  );
  
  const Variant = mongoose.model("Variant",variantSchema);
  module.exports=Variant;