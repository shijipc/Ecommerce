const multer=require("multer");
const path=require("path");
const fs = require('fs');
const sharp = require('sharp');

// Set storage and file configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname,"../public/uploads/re-image")); // You can specify the path where images are stored
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname); // Unique file naming
    }
  });


  // Filter to only accept images
  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  };
  
 // Initialize multer with storage settings
const uploads = multer({ storage: storage, fileFilter: fileFilter });

// Export the configured multer
module.exports = uploads;