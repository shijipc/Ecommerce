const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const Brand=require("../../models/brandSchema");
const User=require("../../models/userSchema");
const fs=require("fs");
const path=require("path");
const sharp=require("sharp");


const getProductAddPage=async(req,res)=>{
    try {
        const category=await Category.find({isListed:true});
        const brand=await Brand.find({isBlocked:false});
        res.render("product-add",{
            cat:category,
            brand:brand
        });
    } catch (error) {
       res.redirect("/pageerror");
    }
};

const addProducts=async(req,res)=>{
    try {
        const products=req.body;
        const productExists=await Product.findOne({
            productName:products.productName,

        });
        if(!productExists){
            const images=[];

            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath=req.files[i].path;

                    const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            const categoryId=await Category.findOne({name:products.category});
            if(!categoryId){
                return res.status(404).join("Invalid category name")
            }

             // Process sizes, Handling sizes array from the form----new code
             const sizes = products.sizes.map(sizeObj => ({
                size: sizeObj.size,
                quantity: sizeObj.quantity
            }));

            const newProduct=new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                sizes,// add size quantity
                color:products.color,
                productImage:images,
                status:'Available',
            });

            await newProduct.save();
            return res.redirect("/admin/addProducts");
        }else{
            return res.status(400).json("Product already exist.please try with another name");
        }
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect("/admin/pageerror")
        
    }
}

const getAllProducts=async(req,res)=>{
    try {
        
      const search=req.query.search || "";
      const page=req.query.page || 1;
      const limit=4;

      const productData=await Product.find({
        $or:[
            {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            {brand:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
      }).limit(limit*1)
      .skip((page-1)*limit)
      .populate('category')
      .exec();

      const count=await Product.find({
        $or:[
            {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            {brand:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
      }).countDocuments();

      const category=await Category.find({isListed:true});
       const brand=await Brand.find({isBlocked:false});
         if(category && brand){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand,
                
            })
         }else{
            res.render("page-404");
         }
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const addProductOffer=async(req,res)=>{
    try {
        const {productId,percentage}=req.body;
        const findProduct=await Product.findOne({_id:productId});
        const findCategory=await Category.findOne({_id:findProduct.category});
        if(findCategory.categoryOffer>percentage){
            return res.json({status:false,message:"This products category already has a category offer"})
        }

        findProduct.salePrice=findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer=parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer=0;
        await findCategory.save();
        res.json({status:true});

    } catch (error) {
        res.redirect("/pageerror");
        res.status(500).json({status:false,message:"Internal Server Error"});
    }
}

//removeProductOffer
const removeProductOffer=async(req,res)=>{
    try {
        const {productId}=req.body;
        const findProduct=await Product.findOne({_id:productId});
        const percentage=findProduct.productOffer;
        findProduct.salePrice=findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
         findProduct.productOffer=0;
         await findProduct.save();
         res.json({status:true});

    } catch (error) {
        res.redirect("/pageerror");
    }
}

//block
const blockProduct=async(req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/pageerror");
    }
}

//unblock
const unblockProduct=async(req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/Products");
    } catch (error) {
        res.redirect("/pageerror");
    }
}


//Edit
const getEditProduct=async(req,res)=>{
    try {
        
       const id=req.query.id;
       const product=await Product.findOne({_id:id});
       const category=await Category.find({});
       const brand=await Brand.find({});
       res.render("edit-product",{
        product:product,
        cat:category,
        brand:brand,
       });

    } catch (error) {
        res.redirect("/pageerror");
    }
}

const editProduct = async (req, res) => {
    try {
        console.log('Received edit product request:', req.body);
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        const data = req.body;
        
        console.log('Checking for existing product...');
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        
        if (existingProduct) {
            console.log('Product with this name already exists');
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
        }
        
        console.log('Processing images...');
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }
        
        console.log('Processing sizes...');
        const sizes = [];
        if (data.sizes && Array.isArray(data.sizes)) {
            for (let i = 0; i < data.sizes.length; i++) {
                if (data.sizes[i].size && data.sizes[i].quantity) {
                    sizes.push({
                        size: parseInt(data.sizes[i].size),
                        quantity: parseInt(data.sizes[i].quantity)
                    });
                }
            }
        }
        
        console.log('Preparing update fields...');
        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            sizes: sizes,
            color: data.color,
            brand: data.brand
        };

        // Handle category update
        if (data.category) {
            // If category is stored as ObjectId in the database
            const category = await Category.findOne({ name: data.category });
            if (category) {
                updateFields.category = category._id;
            } else {
                console.log('Category not found:', data.category);
                // Handle the case where the category doesn't exist
                // You might want to create a new category here, or skip updating this field
            }
        }
        
        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }
        
        console.log('Updating product...');
        const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });
        
        if (!updatedProduct) {
            console.log('Failed to update product');
            return res.status(500).json({ error: "Failed to update product" });
        }
        
        console.log('Product updated successfully');
        res.redirect("/admin/products");
    } catch (error) {
        console.error('Error in editProduct:', error);
        res.status(500).json({ error: 'An error occurred while updating the product. Please try again.', details: error.message });
    }
};
const deleteSingleImage= async(req,res)=>{
    try {
        const {imageNameToServer,productIdToServer}=req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath=path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        }else{
            console.log(`Image ${imageNameToServer} not found`);
        }
        res.send({status:true});
    } catch (error) {
        res.redirect("/pageerror");
    }
}




module.exports={
     getProductAddPage,
     addProducts,
     getAllProducts,
     addProductOffer,   
     removeProductOffer, 
     blockProduct,
     unblockProduct,
     getEditProduct,
     editProduct,
     deleteSingleImage,

}