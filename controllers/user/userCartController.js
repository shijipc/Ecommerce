const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const env = require("dotenv").config();
const Category=require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart=require("../../models/cartSchema");


const addToCart = async (req, res) => {
    try {
        const { productId, quantity, selectedSize } = req.body;
        const userId = req.session.user?._id || req.user?._id;

        console.log('Received in server:', { productId, quantity, selectedSize, userId });

        if (!userId) {
            return res.status(401).json({ message: 'Please login' });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find the selected size within the product's sizes array
        const sizeDetails = product.sizes.find(size => size.size.toString() === selectedSize.toString());

        if (!sizeDetails) {
            return res.status(400).json({ message: 'Selected size not available.' });
        }

        // Check if requested quantity exceeds available quantity
        if (quantity > sizeDetails.quantity) {
            return res.status(400).json({ 
                message: `Only ${sizeDetails.quantity} units available for size ${selectedSize}.` 
            });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.product.toString() === productId && item.size === selectedSize
        );

        if (itemIndex > -1) {
            return res.status(400).json({ 
                message: 'This product with the same size is already in the cart.' 
            });
        } else {
            cart.items.push({
                product: productId,
                size: selectedSize,
                quantity,
                price: product.offerPrice || product.salePrice
            });
        }

        // Reduce the quantity from the product size
        sizeDetails.quantity -= quantity;

        if (sizeDetails.quantity === 0) {
            product.status = "out of stock";
        }

        console.log('Cart before saving:', JSON.stringify(cart, null, 2));
        console.log('Product after quantity update:', JSON.stringify(product, null, 2));

        // Save both cart and product updates
        await cart.save();
        await product.save();

        res.json({ message: 'Product added to cart successfully.' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};


const cart = async (req, res) => {
    try {
        const userId = req.session.user || req.user;
        
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        let cart = await Cart.findOne({ userId: userId })
      .populate({
        path: 'items.product',
        populate: [{ path: 'brand' }, { path: 'category' }]
      })
      .exec();

       
        if (!cart) {
            cart = new Cart({
                userId: userId,
                items: []
            });
            await cart.save();
        }

        
        if (cart.items.length > 0 && cart.items.some(item => item.product && item.product.isBlocked)) {
            const blockedItems = cart.items.filter(item => item.product.isBlocked);
            cart.items = cart.items.filter(item => !item.product.isBlocked);

            for (const item of blockedItems) {
                await Product.findByIdAndUpdate(item.product._id, {
                    $inc: { quantity: item.quantity },
                });
            }
            await cart.save();
        }

        
        let totalPrice = 0;
        let totalItems = 0;
        let distinctProductCount = 0;
        let totalDiscount = 0;  
        const deliveryCharges = 0;
        let cartUpdated = false;
        

        if (cart.items.length > 0) {
            const distinctProducts = new Set(); 
            
            for (const item of cart.items) {
                if (item.product) {
                    const currentPrice =
            item.product.offerPrice && item.product.offerPrice < item.product.salePrice
              ? item.product.offerPrice
              : item.product.salePrice < item.product.regularPrice
              ? item.product.salePrice
              : item.product.regularPrice;

          const currentDiscountAmount =
            item.product.offerPrice && item.product.offerPrice < item.product.regularPrice
              ? item.product.regularPrice - item.product.offerPrice
              : item.product.salePrice < item.product.regularPrice
              ? item.product.regularPrice - item.product.salePrice
              : 0;

          
          if (
            item.price !== currentPrice || 
            item.discountAmount !== currentDiscountAmount || 
            item.regularPrice !== item.product.regularPrice
          ) {
            item.price = currentPrice;
            item.discountAmount = currentDiscountAmount;
            item.regularPrice = item.product.regularPrice;
            cartUpdated = true;
          }

          totalPrice += item.regularPrice * item.quantity;
          totalDiscount += currentDiscountAmount * item.quantity;
          totalItems += item.quantity;
          distinctProducts.add(item.product._id.toString());
        }
      }

      distinctProductCount = distinctProducts.size;

    
      if (cartUpdated) {
        await cart.save();
      }
    }  
        const totalAmount = totalPrice - totalDiscount + deliveryCharges;

       
       return res.render("cart", { 
            cart, 
            totalItems, 
            totalPrice, 
            totalDiscount,  
            deliveryCharges, 
            totalAmount,
            distinctProductCount,
        });
    } catch (error) {
        console.error("Error in fetching cart:", error);
        res.redirect("/pageNotfound");
    }
};

const MAX_QUANTITY_PER_PRODUCT = 5;
const updateQuantity = async (req, res) => {
    const { productId, change, size } = req.body;
    const userId = req.session.user || req.user;

    try {
        let cart = await Cart.findOne({ userId }).populate('items.product');
        if (!cart) {
            return res.status(404).json({ success: false, error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => 
            item.product._id.toString() === productId && 
            item.size === size
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item not found in cart' });
        }

        const item = cart.items[itemIndex];
        const newQuantity = item.quantity + change;

        // Validate minimum quantity
        if (newQuantity < 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Minimum quantity is 1. Use remove button instead.' 
            });
        }

        // Validate maximum quantity
        if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
            return res.status(400).json({ 
                success: false, 
                error: `Maximum quantity limit is ${MAX_QUANTITY_PER_PRODUCT}` 
            });
        }

        // Check stock availability
        const product = await Product.findById(productId);
        const sizeIndex = product.sizes.findIndex(s => s.size === size);
        
        if (sizeIndex === -1 || product.sizes[sizeIndex].quantity < newQuantity) {
            return res.status(400).json({ 
                success: false, 
                error: 'Not enough stock available' 
            });
        }

        // Update stock quantity
        const quantityDifference = change;
        product.sizes[sizeIndex].quantity -= quantityDifference;
        product.status = product.sizes.every(s => s.quantity === 0) ? "Out of stock" : "Available";
        await product.save();

        // Update cart quantity
        cart.items[itemIndex].quantity = newQuantity;
        await cart.save();

        // Calculate updated cart summary
        const cartSummary = calculateCartSummary(cart);

        res.json({
            success: true,
            updatedQuantity: newQuantity,
            productStatus: product.status,
            productQuantity: product.sizes[sizeIndex].quantity,
            cartSummary
        });

    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ 
            success: false, 
            error: 'An error occurred while updating the quantity' 
        });
    }
};

// Helper function to calculate cart summary
const calculateCartSummary = (cart) => {
    let totalPrice = 0;
    let totalDiscount = 0;
    const deliveryCharges = 0;

    cart.items.forEach(item => {
        if (item.product) {
            const currentPrice = item.product.offerPrice && item.product.offerPrice < item.product.salePrice
                ? item.product.offerPrice
                : item.product.salePrice < item.product.regularPrice
                    ? item.product.salePrice
                    : item.product.regularPrice;

            const discountAmount = item.product.regularPrice - currentPrice;
            
            totalPrice += item.product.regularPrice * item.quantity;
            totalDiscount += discountAmount * item.quantity;
        }
    });

    const totalAmount = totalPrice - totalDiscount + deliveryCharges;

    return {
        totalPrice,
        totalDiscount,
        deliveryCharges,
        totalAmount
    };
};

const removeFromCart = async (req, res) => {
    try {
        const { productId, size } = req.body;
        const userId = req.session.user?._id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login' });
        }

        let cart = await Cart.findOne({ userId }).populate('items.product');

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => 
            item.product._id.toString() === productId && item.size === size
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        const itemToRemove = cart.items[itemIndex];

        // Remove the specific item from the cart
        cart.items.splice(itemIndex, 1);

        // Update product quantity and availability status
        const product = await Product.findById(productId);
        const sizeIndex = product.sizes.findIndex(s => s.size === size);
        if (sizeIndex !== -1) {
            product.sizes[sizeIndex].quantity += itemToRemove.quantity;
            product.status = product.sizes.some(s => s.quantity > 0) ? "Available" : "Out of stock";
            await product.save();
        }

        await cart.save();

        res.json({ success: true, message: 'Item removed from cart successfully' });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ success: false, message: 'Server error occurred' });
    }
};


const removeDeletedItem = async (req, res) => {
    try {
        const { itemId } = req.body;
        console.log(itemId)

        await Cart.updateMany(
            { "items._id": itemId },
            { $pull: { items: { _id: itemId } } }
        );

        res.json({ success: true, message: 'Deleted item removed from cart' });
        
    } catch (error) {
        console.error("Error in removing deleted item from cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};




module.exports={
    addToCart,
    cart,
    updateQuantity,
    removeFromCart,
    removeDeletedItem,
}