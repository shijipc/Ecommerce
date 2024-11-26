const User=require("../models/userSchema");


const userAuth = async (req, res, next) => {
    try {
        const userId = req.session.user || (req.user && req.user._id);

        if (userId) {
            const user = await User.findById(userId);

            if (user && !user.isBlocked) {
                req.user = user; 
                res.locals.user = user;
                next();
            } else {
                console.log("User is blocked or not found:", userId);
                res.redirect("/login");
                // res.status(401).json({ success: false, message: 'Please login' });
            }
        } else {
            res.redirect("/login");
            // res.status(401).json({ success: false, message: 'Please login' });
        }
    } catch (error) {
        console.error("Error in user auth middleware:", error);
        res.status(500).json({ success: false, message: 'Server error occurred' });
    }
};


const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login");
        }      
    })
    .catch(error=>{
        console.log("Error in adminauth middleware",error);
        res.status(500).send("Internal Server error");    
    })
}

module.exports={
    userAuth,
    adminAuth
}