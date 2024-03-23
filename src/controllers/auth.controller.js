const bcrypt = require("bcryptjs");
const asyncHanlder = require("express-async-handler");
const User = require("../models/user.model");
const i18n = require("i18n");
const logger = require("../utils/log4jsutil.js");
const AppError = require("../utils/app.error");
const moment = require("moment");
const config = require("config");
const basicUtil = require("../utils/basic.util");
const UserPasswordResetModel = require("../models/userPasswordReset.model");
const Status = require("../utils/status");
const mailUtil = require("../utils/mail.util");
const s3Util = require("../utils/s3.util.js");
const constants = require("./../utils/constants");
const Alluserpasswords = require("../models/alluserpasswords.model");

// @desc    Authenticate a user
// @route   POST /api/v1/auth
// @access  Public
const authenticate = asyncHanlder(async (req, res) => {
  logger.trace("[authController] :: authenticate() : Start");

  const { userName, password } = req.body;
  //Checks for username
  let user = await User.findOne({ userName });

  if (user && (await bcrypt.compare(password, user.password))) {
    if (user.profileImage) {
      try {
        user.profileImage = await s3Util.generateProfileImagePresignedURL(
          user.profileImage
        );
      } catch (err) {}
    }

    const authresponse = await User.findById(user._id).select("-password");
    res.status(200).json({
      user: authresponse,
      status: constants.USER_STATUS.ACTIVE,
    });
  } else {
    logger.error("[authController] :: authenticate() : Unauthorized user");
    throw new AppError(401, i18n.__("UNAUTHORIZED"));
  }

  logger.trace("[authController] :: authenticate() : End");
});

const requestPasswordReset = asyncHanlder(async (req, res) => {
  logger.trace("[authController] :: requestPasswordReset() : Start");
  try {
    const userName = req.body.userName;
    if (!userName) {
      logger.error(
        "[authController] :: requestPasswordReset() : UserName is null"
      );
      throw new AppError(400, i18n.__("BAD_REQUEST"));
    }

    const user = await User.findOne({ userName });

    if (!user) {
      logger.error(
        "[authController] :: requestPasswordReset() : No users with the given userName"
      );
      throw new AppError(404, i18n.__("USER_NOT_FOUND"));
    }

    const currentTime = moment();
    const passwordLinkValidTime = config
      .get("PasswordLinkValidPeriod")
      .replace("h", "");
    const expiryTime = moment(currentTime)
      .add(passwordLinkValidTime, "hours")
      .utc()
      .format("YYYY-MM-DD HH:mm");
    const otp = basicUtil.generateOTP();

    const userPasswordResetModel = await UserPasswordResetModel.create({
      user: user._id,
      resetExpiryTime: expiryTime,
      otp: otp,
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
                <p>Sri Cuisine</p>`,
    };

    const mailSent = await mailUtil.sendMail(mailOptions);
    logger.debug(
      "[authController] :: requestPasswordReset() : mailSent : {" +
        mailSent +
        " }"
    );

    if (!mailSent) {
      throw new AppError(500, i18n.__("EMAIL_SENDING_FAILED"));
    }

    res.status(200).json({
      payload: null,
      status: Status.getSuccessStatus(i18n.__("SUCCESS")),
    });
  } catch (error) {
    logger.error(
      "[authController] :: requestPasswordReset() : error : ",
      error
    );
    const statusCode = error.statusCode || 500;
    const message = error.message || i18n.__("INTERNAL_SERVER_ERROR");
    res.status(statusCode).json({ message });
  }

  logger.trace("[authController] :: requestPasswordReset() : End");
});

// const requestPasswordReset = asyncHanlder(async (req, res) => {
//     logger.trace("[authController] :: requestPasswordReset() : Start");
//     try{
//         userName = req.body.userName;
//     if (!userName) {
//         logger.error("[authController] :: requestPasswordReset() : UserName is null");
//         throw new AppError(400, i18n.__("BAD_REQUEST"))
//     }

//     const user = await User.findOne({ userName });

//     if (!user) {
//         logger.error("[authController] :: requestPasswordReset() : No users with the given userName");
//         throw new AppError(404, i18n.__("USER_NOT_FOUND"))
//     }

//     let currentTime = moment();
//     let passwordLinkValidTime = config.get('PasswordLinkValidPeriod').replace("h", "");
//     const expiryTime = moment(currentTime).add(passwordLinkValidTime, 'hours').utc().format('YYYY-MM-DD HH:mm');
//     const otp = basicUtil.generateOTP();

//     const userPasswordResetModel = await UserPasswordResetModel.create({
//         user: user._id,
//         resetExpiryTime: expiryTime,
//         otp: otp
//     });

//     const mailOptions = {
//         to: user.email,
//         subject: "Sri Cuisine password reset",
//         html: `
//             <p>Hi ${user.userName}, </p>
//             <p>You have requested to change your Sri Cuisine password.
//                Please enter the following OTP to reset your password:</p>
//             <p>OTP: ${otp}</p>
//             <p>This OTP is valid for 24 hours.</p>
//             <p>Thank You,</p>
//             <p>Sri Cuisine</p>`
//     };

//     const mailSent = await mailUtil.sendMail(mailOptions);
//     logger.debug("[authController] :: requestPasswordReset() : mailSent : {" + mailSent + " }");

//     if (!mailSent) {
//         throw new AppError(500, i18n.__("EMAIL_SENDING_FAILED"));
//     }

//     res.status(200).json({ payload: null, status: Status.getSuccessStatus(i18n.__("SUCCESS")) });

//     }catch{
//         logger.error("[authController] :: requestPasswordReset() : error : " + error);
//         res.status(error.statusCode || 500).json({ message: error.message });
//     }

//     logger.trace("[authController] :: requestPasswordReset() : End");
// })

const OTPcheck = asyncHanlder(async (req, res) => {
  logger.trace("[authController] :: resetPassword() : Start");

  const OTP = req.body.otp;
  const userId = req.body.userId;

  const userPasswordResetModel = await UserPasswordResetModel.findOne({
    otp: OTP,
    user: userId,
  });
  if (!userPasswordResetModel) {
    logger.error("[authController] :: resetPassword() : Invalid otp");
    throw new AppError(401, i18n.__("PASSWORD_RESET_INVALID_OTP"));
  }

  let currentTime = moment().utc().format("YYYY-MM-DD HH:mm");
  if (
    new Date(userPasswordResetModel.resetExpiryTime) < new Date(currentTime)
  ) {
    logger.error(
      "[authController] :: resetPassword() : Password reset url is expired"
    );
    throw new AppError(401, i18n.__("PASSWORD_RESET_EXPIRED_LINK"));
  }

  res
    .status(200)
    .json({
      payload: null,
      userId: userId,
      status: Status.getSuccessStatus(i18n.__("SUCCESS")),
    });
});

const resetPassword = asyncHanlder(async (req, res) => {
  logger.trace("[authController] :: resetPassword() : Start");

  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    logger.error(
      "[authController] :: resetPassword() : Missing required fields"
    );
    throw new AppError(400, i18n.__("ERROR_MISSING_REQUIRED_FIELDS"));
  }
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    logger.error(
      "[authController] :: resetPassword() : Password does not meet requirements"
    );
    throw new AppError(400, i18n.__("ERROR_INVALID_PASSWORD_FORMAT"));
  }

  const user = await User.findById(userId);

  if (!user) {
    logger.error("[authController] :: resetPassword() : User not found");
    throw new AppError(404, i18n.__("ERROR_USER_NOT_FOUND"));
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  user.status = "ACTIVE";

  await user.save();

  res.status(200).json({ message: i18n.__("PASSWORD_RESET_SUCCESS") });

  logger.trace("[authController] :: resetPassword() : End");
});

module.exports = {
  authenticate,
  requestPasswordReset,
  OTPcheck,
  resetPassword,
};
