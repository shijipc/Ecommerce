const multer=require("multer");
const path=require("path");


// Set storage and file configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname,"../public/uploads/re-image")); // You can specify the path where images are stored
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname); // Unique file naming
    }
  });

  module.exports=storage;