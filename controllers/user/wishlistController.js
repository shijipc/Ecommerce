const mongoose = require('mongoose');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wishlist=require("../../models/wishlistSchema");



const getWishlist = async (req, res) => {
    try {
        // Get userId from the session, check if it exists
        const userId = req.session.user && req.session.user._id ? req.session.user._id : req.session.user;
  
        if (!userId) {
            return res.status(400).send('User ID not found in session.');
        }
  
        let wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
         
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
            await wishlist.save();
            console.log('New wishlist created for user:', userId);
        }

        res.render('wishlist', { wishlist });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.redirect("/pageNotfound");
    }
  };
  

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;
        console.log("Wishlist item to be added:", productId);
  
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
  
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }
  
        // Check if product already exists in wishlist
        const productExists = wishlist.products.find(
            item => item.productId.toString() === productId
        );
        if (productExists) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }
  
        wishlist.products.push({ productId });
        await wishlist.save();
  
        return res.status(200).json({ message: 'Product added to wishlist successfully' });
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.redirect("/pageNotfound");
    }
  };
  
const deleteWishlistItem = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.user?._id;
        const wishlistId = req.params.wishlistId; 
        console.log("wishlist id:",wishlistId);


        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        console.log("User ID:", userId);
        console.log("Wishlist ID to delete:", wishlistId);

        
        const wishlist = await Wishlist.findOneAndUpdate(
            { userId, 'products._id': wishlistId }, 
            { $pull: { products: { _id: wishlistId } } }, 
            { new: true }
        );

        if (!wishlist) {
            return res.status(404).json({ success: false, error: 'Item not found in wishlist' });
        }

        console.log("Updated Wishlist:", wishlist);

        return res.status(200).json({ success: true, message: 'Item removed successfully' });
    } catch (error) {
        console.error('Error deleting wishlist item:', error);
        res.redirect("/pageNotfound");
    }
};

module.exports={
    getWishlist,
    addToWishlist,
    deleteWishlistItem
}