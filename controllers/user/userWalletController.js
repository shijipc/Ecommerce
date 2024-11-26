const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const mongoose = require("mongoose");
const env = require("dotenv").config();
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const razorpay = require('../../config/razorPay'); 



const wallet = async (req, res) => {
    const userId = res.locals.user._id;
    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
  
    try {
        const user = await User.findById(userId).populate('wallet').exec();
        
        if (!user) {
            return res.status(404).send('User not found');
        }
  
        if (!user.wallet) {
            return res.render('wallet', {
                balance: 0, 
                transactions: [],
                currentPage: page,
                totalPages: 0
            });
        }
  
        const { balance, transactions } = user.wallet;
  
        const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalTransactions = sortedTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const paginatedTransactions = sortedTransactions.slice((page - 1) * limit, page * limit);
  
        return res.render('wallet', {
            balance: balance,
            transactions: paginatedTransactions, 
            currentPage: page,
            totalPages: totalPages
        });
  
    } catch (error) {
      res.redirect("/pageNotfound");
    }
  };


  const checkWalletBalance = async (req, res) => {
    try {
      const { amount } = req.body;

      const userId = res.locals.user._id;

      const user = await User.findById(userId).populate('wallet');
      if (!user || !user.wallet) {
        return res.json({ success: false, message: 'User or wallet not found' });
      }
 
      if (user.wallet.balance < amount) {
        return res.json({ success: false, message: 'Insufficient balance in wallet' });
      }
  
      return res.json({ success: true, message: 'Sufficient balance available' });
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while checking the wallet balance' });
    }
  };

  module.exports = {
    wallet,
    checkWalletBalance,
}