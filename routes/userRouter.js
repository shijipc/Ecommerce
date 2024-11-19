const express= require("express");
const router= express.Router();
const passport = require("passport");
const userController=require("../controllers/user/userController");
const profileController=require("../controllers/user/profileController");
const userAddressController=require("../controllers/user/userAddressController");
const userCartController=require("../controllers/user/userCartController");
const offerController=require("../controllers/user/offerController");
const checkoutController=require("../controllers/user/checkoutController");
const orderController=require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const userWalletController = require("../controllers/user/userWalletController");


const {userAuth}=require("../middlewares/auth");

//error
router.get("/pageNotFound",userController.pageNotFound);

//home page & shopping
router.get("/",userController.loadHomepage);
router.get("/logout",userController.logout);

//signup
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.get("/shop",userController.loadShopping);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-Otp",userController.resendOtp);
router.get("/product-details/:id",userAuth,userController.productDetails);
router.get("/about",userController.about);
router.get("/contact",userController.contact);
router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:"/signup"}),(req,res)=>{
    res.redirect('/')
});
router.get("/offer",userAuth,offerController.loadOfferPage);

//login
 router.get("/login",userController.loadLogin);
 router.post("/login",userController.login);

//Profile
 router.get("/forgot-password",profileController.getForgotPassPage);
 router.post("/forgot-email-valid", profileController.forgotEmailValid);
 router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
 router.get("/reset-password",profileController.getResetPassPage);
 router.post("/resend-forgot-otp",profileController.resendOtp);
 router.post("/reset-password",profileController.postNewPassword);
 router.get("/user-profile",userController.getUserDetails);

 //user Address
 router.get("/address",userAuth,userAddressController.userAddress)
 router.get("/add-new-address",userAuth,userAddressController.addNewAddress);
 router.post("/add-new-address",userAuth,userAddressController.updateNewAddress);
 router.get("/edit-Address",userAuth,userAddressController.getEditAddress);
 router.get("/edit-Address/:id",userAuth,userAddressController.getEditAddress);
 router.post("/edit-Address/:id",userAuth,userAddressController.editAddress);
 router.delete('/deleteAddress', userAuth, userAddressController.deleteAddress);

//user cart
 router.post("/add-cart",userAuth,userCartController.addToCart)
 router.get("/cart",userAuth,userCartController.cart);
 router.post("/cart/update-quantity",userAuth,userCartController.updateQuantity)
 router.post("/cart/remove", userAuth, userCartController.removeFromCart);
 router.delete('/cart/remove-deleted-item',userAuth,userCartController.removeDeletedItem);

//checkout
router.get("/cart/checkout/:id", userAuth, checkoutController.getCheckout);
router.post('/cart/apply-coupon',userAuth, checkoutController.applyCoupon);
router.post("/cart/remove-coupon", userAuth, checkoutController.removeCoupon);
router.post('/placeOrder', userAuth,checkoutController.placeOrder);
router.post('/verify-payment',userAuth,checkoutController.verifyPayment);

//order
router.get('/orderConfirmation/:orderId',userAuth,orderController.orderConfirmation);
router.get('/my-orders',userAuth,orderController.getMyOrders);
router.post('/cancel-order', userAuth,orderController.cancelOrder);
router.post('/myorder/return-order',userAuth, orderController.returnOrder);
router.get('/my-order/order-details/:orderId/:itemId',userAuth, orderController.getOrderDetails);
router.post("/my-order/order-details/re-checkout/:orderId", userAuth,orderController.confirmRePayment);
router.get('/my-order/:orderId/download-invoice/:itemId', userAuth,orderController.downloadInvoice);

//wishlist
router.post('/wishlist',userAuth,wishlistController.addToWishlist);
router.get('/wishlist',userAuth, wishlistController.getWishlist);
router.delete('/wishlist/deleteItems/:wishlistId', userAuth, wishlistController.deleteWishlistItem);

//wallet
router.get("/wallet",userAuth,userWalletController.wallet);



module.exports=router;

