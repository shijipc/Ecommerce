const express =require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminControllers");
const customerController=require("../controllers/admin/customerController");
const categoryController=require("../controllers/admin/categoryController");
const productController=require("../controllers/admin/productController");
const brandController=require("../controllers/admin/brandController");
const orderController=require("../controllers/admin/orderManagementController");
const couponController=require("../controllers/admin/couponController");
const adminOfferController=require("../controllers/admin/adminOfferController");
const salesReportController = require("../controllers/admin/salesReportController");


const {userAuth,adminAuth}=require("../middlewares/auth");
const uploads=require("../helpers/multer");

router.get("/pageerror",adminController.pageerror);

//login mgmt
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/dashboard",adminAuth,adminController.loadDashboard);
router.get("/logout",adminController.logout);

//customer mgmt
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

//category mgmt
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);

//brand mgmt

router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);

//Product Management
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",3),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);


//order management
router.get('/orders',adminAuth,orderController.getAdminOrders);
router.post('/updateItemStatus',adminAuth, orderController.updateItemStatus);
router.post('/updateOrderStatus',adminAuth, orderController.updateOrderStatus);
router.get('/orderDetails/:orderId', adminAuth, orderController.getOrderDetails);
router.get('/return-orders',adminAuth,orderController.getReturnOrders);


//coupon
router.get('/coupons',adminAuth,couponController.getCoupons); 
router.post('/coupons/create',adminAuth, couponController.createCoupon);
router.delete("/coupons/:id", adminAuth, couponController.deleteCoupon);
router.get("/coupons/:id", adminAuth, couponController.editCoupon);
router.put("/coupons/:id", adminAuth, couponController.updateCoupon);

//offer
router.get("/adminOffer", adminAuth,adminOfferController.offer);
router.get("/createOffer",adminAuth,adminOfferController.createOffer);
router.post("/createOffer/addOffer",adminAuth,adminOfferController.addOffer)
router.delete("/adminOffer/:offerId",adminAuth, adminOfferController.deleteOffer)

// sales report
router.get('/sales-report',adminAuth, salesReportController.getSalesReport)
router.post('/filter-sales',adminAuth, salesReportController.filterSalesReport);
router.post('/download-report',adminAuth, salesReportController.downloadReport);



module.exports=router;