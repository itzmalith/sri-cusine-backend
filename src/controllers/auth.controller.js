
const bcrypt = require('bcryptjs')
const asyncHanlder = require('express-async-handler')
const User = require('../models/user.model')
const i18n = require("i18n");
const logger = require('../utils/log4jsutil.js');
const AppError = require('../utils/app.error');
const moment = require('moment');
const config = require('config');
const basicUtil = require("../utils/basic.util");
const UserPasswordResetModel = require('../models/userPasswordReset.model');
const Status = require('../utils/status');
const mailUtil = require('../utils/mail.util');
const s3Util = require('../utils/s3.util.js');
const constants = require("./../utils/constants");
const Alluserpasswords = require('../models/alluserpasswords.model');


// @desc    Authenticate a user
// @route   POST /api/v1/auth
// @access  Public
const authenticate = asyncHanlder(async (req, res) => {
    logger.trace("[authController] :: authenticate() : Start");

    const { userName, password} = req.body
    //Checks for username
    let user = await User.findOne({ userName })
      
    if (user && (await bcrypt.compare(password, user.password))) {
            if (user.profileImage) {
                try {
                    user.profileImage = await s3Util.generateProfileImagePresignedURL(user.profileImage);
                }
                catch (err) {
                }
            }

            const authresponse = await User.findById(user._id).select('-password');
            res.status(200).json({
                user: authresponse,
                status: constants.USER_STATUS.ACTIVE
            })
        
    } else {
        logger.error("[authController] :: authenticate() : Unauthorized user");
        throw new AppError(401, i18n.__("UNAUTHORIZED"));
    }

    logger.trace("[authController] :: authenticate() : End");
})




const requestPasswordReset = asyncHanlder(async (req, res) => {
    logger.trace("[authController] :: requestPasswordReset() : Start");
    try{
        userName = req.body.userName;
    if (!userName) {
        logger.error("[authController] :: requestPasswordReset() : UserName is null");
        throw new AppError(400, i18n.__("BAD_REQUEST"))
    }

    const user = await User.findOne({ userName });

    if (!user) {
        logger.error("[authController] :: requestPasswordReset() : No users with the given userName");
        throw new AppError(404, i18n.__("USER_NOT_FOUND"))
    }

    let currentTime = moment();
    let passwordLinkValidTime = config.get('PasswordLinkValidPeriod').replace("h", "");
    const expiryTime = moment(currentTime).add(passwordLinkValidTime, 'hours').utc().format('YYYY-MM-DD HH:mm');
    const otp = basicUtil.generateOTP();
    
    const userPasswordResetModel = await UserPasswordResetModel.create({
        user: user._id,
        resetExpiryTime: expiryTime,
        otp: otp 
    });

    
    const mailOptions = {
        to: user.email,
        subject: "Sri Cuisine password reset",
        html: `
            <p>Hi ${user.userName}, </p>
            <p>You have requested to change your Sri Cuisine password. 
               Please enter the following OTP to reset your password:</p>
            <p>OTP: ${otp}</p> 
            <p>This OTP is valid for 24 hours.</p> 
            <p>Thank You,</p>
            <p>Sri Cuisine</p>`
    };


    const mailSent = await mailUtil.sendMail(mailOptions);
    logger.debug("[authController] :: requestPasswordReset() : mailSent : {" + mailSent + " }");

    if (!mailSent) {
        throw new AppError(500, i18n.__("EMAIL_SENDING_FAILED"));
    }

    res.status(200).json({ payload: null, status: Status.getSuccessStatus(i18n.__("SUCCESS")) });

    }catch{
        logger.error("[authController] :: requestPasswordReset() : error : " + error);
        res.status(error.statusCode || 500).json({ message: error.message });  
    }
    

    logger.trace("[authController] :: requestPasswordReset() : End");
})

const resetPassword = asyncHanlder(async (req, res) => {
    logger.trace("[authController] :: resetPassword() : Start");
    
    const OTP = req.body.otp;
    const userName = req.body.userName;
    
    
    const userPasswordResetModel = await UserPasswordResetModel.findOne({ otp: OTP , userName :userName });
    if (!userPasswordResetModel) {
        logger.error("[authController] :: resetPassword() : Invalid otp");
        throw new AppError(401, i18n.__("PASSWORD_RESET_INVALID_OTP"));
    }

    let currentTime = moment().utc().format('YYYY-MM-DD HH:mm');
    if (new Date(userPasswordResetModel.resetExpiryTime) < new Date(currentTime)) {
        logger.error("[authController] :: resetPassword() : Password reset url is expired");
        throw new AppError(401, i18n.__("PASSWORD_RESET_EXPIRED_LINK"));
    }

    const user = userPasswordResetModel.user._id 

    const allUserPasswords = await Alluserpasswords.findOne({ User: user});

    if (allUserPasswords) {
        const lastThreeHashedPasswords = allUserPasswords.hashedPasswords.slice(-3);

        const matchFound = await Promise.all(lastThreeHashedPasswords.map(async (hashedPassword) => {
            return await bcrypt.compare(newPassword, hashedPassword);
        }));

        if (matchFound.some(result => result)) {
            logger.error("[authController] :: resetPassword() : Cannot reuse old passwords");
            throw new AppError(402, i18n.__("NEW_PASSWORD_ALREADY_USED"));
        }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashsedPassword = await bcrypt.hash(newPassword, salt)

    const updatedUser = await User.findByIdAndUpdate(userPasswordResetModel.user,
        {
            password: hashsedPassword,
            status: constants.USER_STATUS.ACTIVE
        }, { new: true });

    if (!updatedUser) {
        logger.error("[authController] :: resetPassword() : No users with the given id");
        throw new AppError(404, i18n.__("USER_NOT_FOUND"))
    }

    if (allUserPasswords) {
        allUserPasswords.hashedPasswords.push(hashsedPassword);
        await allUserPasswords.save();

    } else {
        await Alluserpasswords.create({ User: user._id, hashedPasswords: [hashsedPassword] });
    }

    const result = await UserPasswordResetModel.deleteOne({ _id: userPasswordResetModel._id })

    res.status(200).json({ payload: null, status: Status.getSuccessStatus(i18n.__("SUCCESS")) });
    logger.trace("[authController] :: resetPassword() : End");
})

const resetLinkExpiry = asyncHanlder(async (req, res) => {
    logger.trace("[authController] :: checkResetLinkExpiry() : Start");
    const reqId = req.body.reqId;
    const keyCode = req.body.keyCode;

    let currentTime = moment().utc().format('YYYY-MM-DD HH:mm');
    if (new Date(userPasswordResetModel.resetExpiryTime) < new Date(currentTime)) {
        logger.error("[authController] :: checkResetLinkExpiry() : Password reset url is expired");
        throw new AppError(402, i18n.__("PASSWORD_RESET_EXPIRED_LINK"));
    }

    const userPasswordResetModel = await UserPasswordResetModel.findOne({ _id: reqId, keyCode: keyCode });
    if (!userPasswordResetModel) {
        logger.error("[authController] :: checkResetLinkExpiry() : Invalid Link");
        throw new AppError(401, i18n.__("PASSWORD_RESET_INVALID_LINK"));
    }

    
    res.status(200).json({ payload: null, status: Status.getSuccessStatus(i18n.__("SUCCESS")) });
    logger.trace("[authController] :: checkResetLinkExpiry() : End");
});


module.exports = {
    authenticate,
    requestPasswordReset,
    resetPassword,
    resetLinkExpiry,
}
