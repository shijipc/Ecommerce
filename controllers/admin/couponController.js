const Coupon=require("../../models/couponSchema");
const User=require("../../models/userSchema");



// Get all coupons with optional search functionality
const getCoupons = async (req, res) => {
  try {
    const search = req.query.search || "";
    const coupons = await Coupon.find({
      code: { $regex: search, $options: "i" },
    }).sort({ createdAt: -1 });
    
    res.render("coupons", { coupons, search });
  } catch (error) {
    console.error("Error retrieving coupons:", error);
    res.status(500).send("An error occurred while retrieving the coupons.");
  }
};

// Create a new coupon
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxPurchaseAmount,
      startDate,
      endDate,
      usageLimit,
      status,
    } = req.body;

    // Validate form data
    if (
      !code ||
      !description ||
      !discountType ||
      !discountValue ||
      !minPurchaseAmount ||
      !maxPurchaseAmount ||
      !startDate ||
      !endDate ||
      !usageLimit ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all the required fields.",
      });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists. Please try a different code.",
      });
    }

    const newCoupon = new Coupon({
      code,
      description,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxPurchaseAmount,
      startDate,
      endDate,
      usageLimit,
      status,
    });
    await newCoupon.save();

    // Render the coupons page with the updated coupons list
    const coupons = await Coupon.find();
    // res.render("coupons", { coupons });
    res.status(200).json({
      success: true,
      message: "created coupon successfully",
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the coupon",
    });
  }
};

// Delete a coupon

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ success: false, message: "An error occurred while deleting the coupon" });
  }
};

//updatecoupon
// const updateCoupon = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const coupon = await Coupon.findById(id);
//     if (!coupon) {
//       return res.status(404).json({ success: false, message: "Coupon not found" });
//     }
//     res.status(200).json({ success: true, coupon });
//   } catch (error) {
//     console.error("Error fetching coupon:", error);
//     res.status(500).json({ success: false, message: "An error occurred while fetching the coupon" });
//   }
// };


const updateCoupon = async (req, res) => {
  try {
      const { id } = req.params;
      const updates = {
          code: req.body.code,
          description: req.body.description,
          discountType: req.body.discountType,
          discountValue: Number(req.body.discountValue),
          minPurchaseAmount: Number(req.body.minPurchaseAmount),
          maxPurchaseAmount: Number(req.body.maxPurchaseAmount),
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
          usageLimit: Number(req.body.usageLimit),
          status: req.body.status,
          updatedAt: new Date()
      };

      // Check if another coupon exists with the same code (excluding current coupon)
      const existingCoupon = await Coupon.findOne({
          code: updates.code,
          _id: { $ne: id } // Exclude the current coupon being updated
      });

      if (existingCoupon) {
          return res.status(400).json({
              success: false,
              message: "Coupon code already exists. Please try a different code"
          });
      }

      const coupon = await Coupon.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true, runValidators: true }
      );

      if (!coupon) {
          return res.status(404).json({
              success: false,
              message: "Coupon not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Coupon updated successfully",
          coupon
      });
  } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({
          success: false,
          message: "An error occurred while updating the coupon"
      });
  }
};


  module.exports={
    getCoupons,
    createCoupon,
    deleteCoupon,
    // getCouponById,
    updateCoupon,
  }