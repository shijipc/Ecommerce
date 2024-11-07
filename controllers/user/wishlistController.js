const mongoose = require('mongoose');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wishlist=require("../../models/wishlistSchema");



// const getWishlist = async (req, res, next) => {
//   try {
//       const userId = req.session.user && req.session.user._id ? req.session.user._id : req.session.user;

//       if (!userId) {
//           return res.status(400).send('User ID not found in session.');
//       }

//       let wishlist = await Wishlist.findOne({ userId }).populate('products.productsId');
      
//       // If wishlist does not exist, create an empty one
//       if (!wishlist) {
//           wishlist = await new Wishlist({ userId, products: [] }).save();
//       } 

//       res.render('wishlist', { wishlist });
//   } catch (error) {
//       console.error('Error fetching wishlist:', error.message);
//       next(error);
//   }
// };


const getWishlist = async (req, res) => {
    try {
        console.log("Fetching wishlist for user:", req.user._id);
        const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('products.productsId');

        console.log("Wishlist:", wishlist); 

        let wishlistItems = [];
        if (wishlist && wishlist.products) {
            wishlistItems = wishlist.products.map(item => ({
                product: item.productsId,
                addedOn: item.addedOn,
                size: item.size
            }));
        }

        console.log("Wishlist items:", wishlistItems); 
        res.render('wishlist', { wishlistItems });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching the wishlist');
    }
};


const addToWishlist = async (req, res, next) => {
  try {
      const userId = req.session.user;
      const { productId, size } = req.body; 

      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      let wishlist = await Wishlist.findOne({ userId: userId._id });
      if (!wishlist) {
          wishlist = new Wishlist({ userId, products: [] });
      }

      const productExists = wishlist.products.find(
          item => item.productsId.toString() === productId && item.size === size
      );
      if (productExists) {
          return res.status(400).json({ message: 'Product already in wishlist' });
      }

      wishlist.products.push({ productsId: productId, size }); 
      await wishlist.save();

      return res.status(200).json({ message: 'Product added to wishlist successfully' });
  } catch (error) {
      console.error('Error adding product to wishlist:', error);
      next(error);
  }
};


const deleteWishlistItem = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.user?._id;
        const { productId, size } = req.body; rs


        // Validate productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, error: "Invalid product ID." });
        }

        // Find the wishlist for the user
        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, error: "Wishlist not found." });
        }

        // Remove the product with the specific size from the products array
        wishlist.products = wishlist.products.filter(
            (item) => item.productsId.toString() !== productId || item.size !== size
        );

     await wishlist.save();

        return res.json({ success: true, message: "Product removed from wishlist." });
    } catch (error) {
        console.error("Error in deleteWishlistItem:", error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};


module.exports={
    getWishlist,
    addToWishlist,
    deleteWishlistItem,
}