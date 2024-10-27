const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const Product=require("../../models/productSchema");
const Cart=require("../../models/cartSchema");
const Address = require("../../models/addressSchema");



const loadOfferPage = async (req, res) => {
    try {
        let userId;
        const categories = await Category.find({ isListed: true });

        const { sort, search, minPrice, maxPrice, category, page = 1 } = req.query;

        // Base query: Only `isBlocked` is applied initially.
        let query = { isBlocked: false };

        const options = {
            page: Number(page),
            limit: 12,
            sort: {}
        };

        // Filter by category if provided
        if (category) {
            query.category = category;
        } else {
            query.category = { $in: categories.map(cat => cat._id) };
        }

        // Search filter
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.salePrice = {};
            if (minPrice) query.salePrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.salePrice.$lte = parseFloat(maxPrice);
        }

        // Sorting logic
        switch (sort) {
            case 'popularity':
                options.sort.sales = -1; break;
            case 'priceAsc':
                options.sort.salePrice = 1; break;
            case 'priceDesc':
                options.sort.salePrice = -1; break;
            case 'rating':
                options.sort.ratings = -1; break;
            case 'featured':
                query.isFeatured = true; break;
            case 'newArrivals':
                options.sort.createdAt = -1; break;
            case 'aToZ':
                options.sort.productName = 1; break;
            case 'zToA':
                options.sort.productName = -1; break;
            default:
                options.sort.createdAt = -1;
        }

        // Fetch paginated products
        const products = await Product.paginate(query, options);

        // User Authentication
        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }

        const renderData = {
            products: products.docs,
            categories,
            totalPages: products.totalPages,
            currentPage: products.page,
            sort,
            search,
            minPrice,
            maxPrice,
            category
        };

        if (userId) {
            const userData = await User.findById(userId);
            renderData.user = userData;
        }

        return res.render("offer", renderData);
    } catch (error) {
        console.error("Offer page error:", error);
        res.status(500).send("Server error: " + error.message);
    }
};





module.exports={
    loadOfferPage,

}