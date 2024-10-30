const mongoose = require('mongoose');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wishlist=require("../../models/wishlistSchema");

const getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('products.productsId');
       
        let wishlistItems = [];
        if (wishlist && wishlist.products) {
            wishlistItems = wishlist.products.map(item => ({
                product: item.productsId,
                addedOn: item.addedOn,
                size: item.selectedSize
            }));
        }

        res.render('wishlist', {wishlist, wishlistItems });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching the wishlist');
    }
};


const addToWishlist = async (req, res) => {
  console.log(req.body);
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const wishlist = await Wishlist.findOne({ userId: req.session.user });

    if (wishlist) {
      const productExists = wishlist.products.some(
        (item) => item.productsId.toString() === productId
      );

      if (productExists) {
        return res.status(409).json({ message: 'Product is already in your wishlist' });
      } else {
        wishlist.products.push({ productsId: productId });
        await wishlist.save();
        return res.status(200).json({ message: 'Product added to wishlist' });
      }
    } else {
      const newWishlist = new Wishlist({
        userId: req.session.user,
        products: [{ productsId: productId }],
      });
      await newWishlist.save();
      return res.status(201).json({ message: 'Product added successfully' });
    }
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
};


const deleteWishlistItem = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.user?._id;
    const { productId } = req.body;

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, error: "Invalid product ID." });
    }

    // Find the wishlist for the user
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: "Wishlist not found." });
    }

    // Remove the product from the products array
    wishlist.products = wishlist.products.filter(
      (item) => item.productsId.toString() !== productId
    );

    // Save the updated wishlist
    await wishlist.save();

    return res.json({ success: true, message: "Product removed from wishlist." });
  } catch (error) {
    console.error("Error in deleteWishlistItem:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};




// const deleteProduct = async (req, res) => {
//   const { wishlistId, productId, productSize } = req.body;

//   // Validate the IDs
//   if (!wishlistId || !productId) {
//       return res.status(400).json({ success: false, error: 'Missing required parameters.' });
//   }

//   try {
//       const wishlist = await Wishlist.findById(wishlistId);

//       if (!wishlist) {
//           return res.status(404).json({ success: false, error: 'Wishlist not found.' });
//       }

//       // Filter out the product with the matching ID and size
//       wishlist.products = wishlist.products.filter(
//           (item) => 
//               item.productsId.toString() !== productId || item.size !== productSize
//       );

//       await wishlist.save();

//       res.status(200).json({ success: true, message: 'Item deleted successfully.' });
//   } catch (error) {
//       console.error('Error deleting wishlist item:', error);
//       res.status(500).json({ success: false, error: 'Server error. Could not delete item.' });
//   }
// };

module.exports={
    getWishlist,
    addToWishlist,
    deleteWishlistItem,
}