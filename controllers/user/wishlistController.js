const mongoose = require('mongoose');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wishlist=require("../../models/wishlistSchema");



const getWishlist = async (req, res, next) => {
  try {
      const userId = req.session.user && req.session.user._id ? req.session.user._id : req.session.user;

      if (!userId) {
          return res.status(400).send('User ID not found in session.');
      }

      let wishlist = await Wishlist.findOne({ userId }).populate('products.productsId');
      
      // If wishlist does not exist, create an empty one
      if (!wishlist) {
          wishlist = await new Wishlist({ userId, products: [] }).save();
      } 

      res.render('wishlist', { wishlist });
  } catch (error) {
      console.error('Error fetching wishlist:', error.message);
      next(error);
  }
};


// const getWishlist = async (req, res) => {
//     try {

      
//         const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('products.productsId');
       
//         let wishlistItems = [];
//         if (wishlist && wishlist.products) {
//             wishlistItems = wishlist.products.map(item => ({
//                 product: item.productsId,
//                 addedOn: item.addedOn,
//                 size: item.selectedSize
//             }));
//         }

//         res.render('wishlist', {wishlist, wishlistItems });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('An error occurred while fetching the wishlist');
//     }
// };


const addToWishlist = async (req, res) => {
  try {
      const { productId, selectedSize } = req.body;
      const userId = req.session.user?._id || req.user?._id;
      
      console.log('Request body:', req.body);
      console.log('Received in server:', { productId, selectedSize, userId });
      
       // Validation checks
      if (!userId) {
          return res.status(401).json({ message: 'Please login' });
      }

      if (!productId || !selectedSize) {
        return res.status(400).json({ 
            message: 'Product ID and size are required' 
        });
    }
      
      const product = await Product.findById(productId);
      console.log('Found product:', product); 
      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }
      
      // Validate size exists in product
      const sizeExists = product.sizes.some(s => s.size === selectedSize);
        if (!sizeExists) {
            return res.status(400).json({ message: 'Invalid size selected' });
        }
      
      let wishlist = await Wishlist.findOne({ userId });
      if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [] });
      }
      
      // Check for duplicate
      const existingItem = wishlist.products.find(item => 
        item.productsId.toString() === productId && 
        item.size.toString() === selectedSize
    );

    if (existingItem) {
        return res.status(400).json({ 
            message: 'This product with the same size is already in the wishlist.' 
        });
    }
      
      // Add new item to the wishlist
      wishlist.products.push({
        productsId: productId,
        size: selectedSize,
        quantity: 1,
        addedOn: new Date()
    });

      // Save wishlist
      await wishlist.save();
      console.log('Saved wishlist:', wishlist);
      
      res.json({ message: 'Product added to wishlist successfully.' });
  } catch (error) {
      console.error('Error adding to wishlist:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// const addToWishlist = async (req, res) => {
//   try {
//       const { productId,selectedSize } = req.body;
//       const userId = req.session.user?._id || req.user?._id;

//       console.log('Received in server:', { productId, selectedSize, userId });

//       if (!userId) {
//           return res.status(401).json({ message: 'Please login' });
//       }

//       const product = await Product.findById(productId);

//       if (!product) {
//           return res.status(404).json({ message: 'Product not found' });
//       }

//       // Find the selected size within the product's sizes array
//       const sizeDetails = product.sizes.find(size => size.size === selectedSize);

//       if (!sizeDetails) {
//           return res.status(400).json({ message: 'Selected size not available.' });
//       }

//       // Check if requested quantity exceeds available quantity
//       if (quantity > sizeDetails.quantity) {
//           return res.status(400).json({ 
//               message: `Only ${sizeDetails.quantity} units available for size ${selectedSize}.` 
//           });
//       }

//       let wishlist = await Wishlist.findOne({ userId });
//       if (!wishlist) {
//         wishlist = new Wishlist({ userId, items: [] });
//       }

//       const itemIndex = wishlist.items.findIndex(item =>
//           item.product.toString() === productId && item.size === selectedSize
//       );

//       if (itemIndex > -1) {
//           return res.status(400).json({ 
//               message: 'This product with the same size is already in the cart.' 
//           });
//       } else {
//           // Add new item to the wishlist
//           wishlist.items.push({
//               product: productId,
//               size: selectedSize,
//               price: product.offerPrice || product.salePrice
//           });
//       }

//       // // Reduce the quantity from the product size
//       // sizeDetails.quantity -= quantity;

//       // If the quantity reaches 0, mark the status as "out of stock"
//       if (sizeDetails.quantity === 0) {
//           product.status = "out of stock";
//       }

//       console.log('wishlist before saving:', JSON.stringify(wishlist, null, 2));
//       console.log('Product after quantity update:', JSON.stringify(product, null, 2));

//       // Save both cart and product updates
//       await wishlist.save();
//       // await product.save();

//       res.json({ message: 'Product added to cart successfully.' });
//   } catch (error) {
//       console.error('Error adding to cart:', error);
//       res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// };



// const addToWishlist = async (req, res) => {
//   try {
//     // Validate user is logged in
//     // if (!req.session.userId) {
//     //     return res.status(401).json({ message: 'Please log in to add to wishlist' });
//     // }
  
//     const { productId, size, quantity } = req.body;
//     console.log(productId);
//     console.log(size);
//     console.log(quantity);
//     // Validate input
//     if (!productId || !size || !quantity) {
//         return res.status(400).json({ message: 'Invalid request parameters' });
//     }
  
//     // Check if product exists
//     const product = await Product.findById(productId);
//     if (!product) {
//         return res.status(404).json({ message: 'Product not found' });
//     }
  
//     // Find or create wishlist for user
//     let wishlist = await Wishlist.findOne({ userId: req.session.userId });
//     if (!wishlist) {
//         wishlist = new Wishlist({ userId: req.session.userId, products: [] });
//     }
  
//     // Check if product already in wishlist
//     const existingProductIndex = wishlist.products.findIndex(
//         p => p.productsId.toString() === productId && p.size === size
//     );
  
//     if (existingProductIndex !== -1) {
//         return res.status(409).json({ message: 'Product already in wishlist' });
//     }
  
//     // Add product to wishlist
//     wishlist.products.push({
//         productsId: productId,
//         size,
//         quantity,
//         addedOn: new Date()
//     });
  
//     await wishlist.save();
  
//     res.status(200).json({ message: 'Product added to wishlist successfully' });
//   } catch (error) {
//     console.error('Wishlist add error:', error);
//     res.status(500).json({ message: 'An unexpected error occurred' });
//   }
//   }

// const addToWishlist = async (req, res) => {
//   console.log(req.body);
//   const { productId } = req.body;

//   if (!productId) {
//     return res.status(400).json({ message: 'Product ID is required' });
//   }

//   try {
//     const wishlist = await Wishlist.findOne({ userId: req.session.user });

//     if (wishlist) {
//       const productExists = wishlist.products.some(
//         (item) => item.productsId.toString() === productId
//       );

//       if (productExists) {
//         return res.status(409).json({ message: 'Product is already in your wishlist' });
//       } else {
//         wishlist.products.push({ productsId: productId });
//         await wishlist.save();
//         return res.status(200).json({ message: 'Product added to wishlist' });
//       }
//     } else {
//       const newWishlist = new Wishlist({
//         userId: req.session.user,
//         products: [{ productsId: productId }],
//       });
//       await newWishlist.save();
//       return res.status(201).json({ message: 'Product added successfully' });
//     }
//   } catch (error) {
//     console.error('Error adding to wishlist:', error);
//     res.status(500).json({ message: 'An error occurred' });
//   }
// };


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