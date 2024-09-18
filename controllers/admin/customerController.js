const User= require("../../models/userSchema");


const customerInfo=async(req,res)=>{
    try {
        let search=req.query.search|| "";
        let page =parseInt(req.query.page)|| 1;
        
        const limit=10; //oru page il 10 usersye kaanikkan vendi
        
         const userData=await User.find({
            isAdmin:false,  //displaying only all user details.
            $or:[
                {name:{$regex:".*" + search + ".*",$options:'i'}},
                {email:{$regex:".*" + search + ".*",$options:'i'}}
            ]
         })
         .limit(limit)
         .skip((page-1)*limit)
         .exec();//chain of promisene combine cheyyan vendiyanu exec() use cheyyunnathu

         const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:"." + search + ".",$options:'i'}},
                {email:{$regex:"." + search + ".",$options:'i'}}
            ]
         }).countDocuments();

         res.render('customers',{users:userData,currentPage:page,totalPages:Math.ceil(count/limit)});

    } catch (error) {
        res.redirect("/pageerror");
    }
};

const customerBlocked= async(req,res)=>{
  try {
    let id=req.query.id;
    await User.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect("/admin/users");
  } catch (error) {
    res.redirect("/pageerror");
  }
}

const customerunBlocked= async(req,res)=>{
    try {
        
      let id=req.query.id;
      await User.updateOne({_id:id},{$set:{isBlocked:false}});
      res.redirect("/admin/users");

    } catch (error) {
        res.redirect("/pageerror");
    }
}


module.exports={
    customerInfo,
    customerBlocked,
    customerunBlocked,
}