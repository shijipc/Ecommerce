const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const Product=require("../../models/productSchema");
const Cart=require("../../models/cartSchema");
const Address = require("../../models/addressSchema");

const pageNotFound=async(req,res)=>{
    try{
       res.render("page-404");
    }catch(error){
       res.redirect("/pageNotFound");
    }
}

const loadHomepage=async(req,res)=>{
    try{

        let userId;

        const categories=await Category.find({isListed:true});
        const products=await Product.find(
            {
               isBlocked:false,
               category:{$in:categories.map(category=>category._id)},quantity:{$gt:0} 
            })
          
        if(req.user){
             userId = req.user; 
        } else if(req.session.user){
            userId = req.session.user;
        }
        if (userId) {
            sessionActive =true;
            const userData = await User.findById(userId);                  
            // res.locals.user = userData; 
            return res.render("home", { user: userData,products});
        
        }
        else{
            return res.render("home",{products});
        }
      
    }catch(error){
         console.log("Home page not found",error);
         res.status(500).send("Server error");      
    }
}

const loadSignup=async(req,res)=>{
    try{
        return res.render('signup');
    }catch(error){
         console.log('Home page not loading:',error);
         res.status(500).send('Server Error');
    }
}

//offer
const loadOfferPage=async(req,res)=>{
        try {
            let userId;  
            const products = await Product.find({})
                .populate("category");
             
            // Fetch latest 4 products (new arrivals)
            const newArrivals = await Product.find({}).sort({ _id: -1 }).limit(4);
    
            if (req.user) {
                userId = req.user;
            } else if (req.session.user) {
                userId = req.session.user;
            }
    
            if (userId) {
                const userData = await User.findById(userId);
                res.locals.user = userData;
                return res.render("offer", { 
                    user: userData, 
                    products,
                    newArrivals 
                    
                });
            } else {
                return res.render("offer", { 
                    products, 
                    newArrivals
                });
            }
    
        } catch (error) {
            console.log("Shopping page not found", error);
            res.status(500).send("Server error");
        }
    }
    

//shop
const loadShopping = async (req, res) => {
    try {
        let userId;
        const limit = 8; // Number of products per page
        const page = parseInt(req.query.page) || 1; // Get the page number from query params, default is 1
        const skip = (page - 1) * limit;

        const products = await Product.find({})
            .populate("category")
            .skip(skip)
            .limit(limit);

        // Fetch total count of products for pagination logic
        const totalProducts = await Product.countDocuments({});
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch latest 4 products (new arrivals)
       const newArrivals = await Product.find({}).sort({ _id: -1 }).limit(4);

        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }

        if (userId) {
            const userData = await User.findById(userId);
            res.locals.user = userData;
            return res.render("shop", { 
                user: userData, 
                products, 
                newArrivals, 
                currentPage: page, 
                totalPages 
            });
        } else {
             return res.render("shop",
            { 
              products, 
                newArrivals, 
                currentPage: page, 
                totalPages 
            });
        }

    } catch (error) {
        console.log("Shopping page not found", error);
        res.status(500).send("Server error");
    }
};


function generateOtp(){
    //generating 6 digits otp
    return Math.floor(100000 +Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp){
    try {
       
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info=await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP :${otp}</b>`,

        })
        return info.accepted.length >0

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
}

const signup=async(req,res)=>{ 
    try{
       const {name,phone,email,password,cPassword}=req.body;
       
       if(password !== cPassword){
        return res.render("signup",{message:"Passwords do not match"});
       }
     
    const findUser=await User.findOne({email});
     if(findUser){
        return res.render("signup",{message:"User with this email already exists"});   
     }

    const otp=generateOtp();

    const emailSent=await sendVerificationEmail(email,otp);
     if(!emailSent){
        return res.json("email.error")
     }
     req.session.userOtp=otp;
     req.session.userData={name,phone,email,password};

     res.render("verify-otp");
     console.log("OTP Sent",otp);
    }catch(error){
        console.error("signup error",error);
        res.redirect("/pageNotFound");
    }
}


const securePassword=async(password)=>{
    try {
         const passwordHash=await bcrypt.hash(password,10)
         return passwordHash;
    } catch (error) {
        
    }
}

const verifyOtp=async(req,res)=>{
   try {
    const {otp}=req.body;
    console.log(otp);
    if(otp===req.session.userOtp){
        const user=req.session.userData
        const passwordHash=await securePassword(user.password);
        
        const saveUserData=new User({
            name:user.name,
            email:user.email,
            phone:user.phone,
            password:passwordHash,
        })
        await saveUserData.save();
        req.session.user=saveUserData._id;
        res.json({success:true,redirectUrl:"/"})
    }else{
        res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
    }
   } catch (error) {
    console.error("Error Verifying OTP",error);
    res.status(500).json({success:false,message:"An error occured"})
   } 
}

const resendOtp=async(req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp=generateOtp();
        req.session.userOtp=otp;
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
           console.log("Resend OTP:",otp);
           res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP.please try again"});   
        }
    } catch (error) {
        console.error("Error resending OTP",error);
        res.status(500).json({success:false,message:"Internal Server Error.Please try again"});
    }
}

const loadLogin=async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render("login");
        }else{
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("/pageNotfound");
    }
}

const login=async(req,res)=>{
    try {
        const {email,password}=req.body;

        const user=await User.findOne({isAdmin:0,email:email});

        if(!user){
            return res.render("login",{message:"User not found"})
        }
        if(user.isBlocked){
            return res.render("login",{message:"User is blocked by admin"});
        }

        const passwordMatch = await bcrypt.compare(password,user.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user=user._id;
        res.redirect("/shop");

    } catch (error) {
        console.error("login error",error);
        res.render("login",{message:"login failed.Please try again later"});
    }
}

const logout=async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if (err){
               console.log("session destruction error",err.message);
               return res.redirect("pageNotFound");
            }
            return res.redirect("/login");
        })
    } catch (error) {
        console.log("Logout error",error);
        res.redirect("pageNotFound")
    }
}

//productdetails
const productDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.session.user || req.user; // Use _id if stored in session or user object

        console.log('Session:', req.session);
        console.log('User ID:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login' });
            // or you could redirect
            // return res.redirect('/login');
        }

        const product = await Product.findById(productId);
        const relatedProducts = await Product.find({});

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Limit related products to the first 4
        const limitedRelatedProducts = relatedProducts.slice(0, 4);

        res.render('product-details', { product, products: limitedRelatedProducts });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

  
  const about = async (req, res) => {
    try {
      let userId;
      if (req.user) {
        userId = req.user;
        console.log("User ID from req.user:", userId);
      } else if (req.session.user) {
        userId = req.session.user;
        //console.log("User ID from session:", userId);
      }
  
      if (userId) {
        const userData = await User.findById(userId);
        if (!userData) {
          console.log("User not found for ID:", userId);
        }
        res.locals.user = userData;
        return res.render("about", { user: userData });
      } else {
        // console.log("No user logged in, rendering about");
        return res.render("about");
      }
    } catch (error) {
      console.log("About page not found", error);
      res.status(500).send("Server error");
    }
  };


  const contact = async (req, res) => {
    try {
      let userId;
      if (req.user) {
        userId = req.user;
        console.log("User ID from req.user:", userId);
      } else if (req.session.user) {
        userId = req.session.user;
        //console.log("User ID from session:", userId);
      }
  
      if (userId) {
        const userData = await User.findById(userId);
        if (!userData) {
          console.log("User not found for ID:", userId);
        }
        res.locals.user = userData;
        return res.render("contact", { user: userData });
      } else {
        // console.log("No user logged in, rendering about");
        return res.render("contact");
      }
    } catch (error) {
      console.log("About page not found", error);
      res.status(500).send("Server error");
    }
  };
  

  const getUserDetails = async (req, res) => {
    try {
        let userId;

        if (req.user) {
            userId = req.user._id; 
         
        } else if (req.session.user) {
            userId = req.session.user; 
           
        }

        if (userId) {
            const userData = await User.findOne({ _id: userId }).populate('address');
            if (!userData) {
                //console.log("User not found for ID:", userId);
                return res.status(404).send("User not found");
            }
            const addresses = await Address.find({ userId: userId });
            return res.render("user-profile", {
                user: userData,
                addresses: userData.address 
            });

        } else {
            console.log("No user logged in, rendering user details page without data");
            return res.render("user-profile", { user: null,addresses: [] });
        }

       
    } catch (error) {
        console.error("Error fetching user details:", error);
        return res.status(500).send("Server error");
    }
};



module.exports={
    loadHomepage,
    loadSignup,
    loadShopping,
    loadOfferPage,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    pageNotFound,
    productDetails,
    about,
    contact,
    login,
    logout,
    getUserDetails,  
}