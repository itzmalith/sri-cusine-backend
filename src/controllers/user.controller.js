const bcrypt = require('bcryptjs')
const asyncHandler = require('express-async-handler')
const User = require('../models/user.model')
const i18n = require("i18n");
const logger = require('../utils/log4jsutil');
const AppError = require('../utils/app.error');
const Status = require('../utils/status.js');
const constants = require('../utils/constants.js')
const mongoose = require('mongoose');
const path = require('path');
const mime = require('mime-types')
const { v1: uuidv1 } = require('uuid');
const config = require('config');
const basicUtil = require("../utils/basic.util.js");
const Alluserpasswords = require('../models/alluserpasswords.model');

// @desc    Authenticate a user
// @route   GET /api/v1/users
// @access  Public
const getUsers = asyncHandler(async (req, res) => {
    logger.trace("userController] :: getUsers() : Start"); 
    const users = await User.find().select('-password');
    res.status(200).json(users);
    logger.trace("[userController] :: getUsers() : End"); 
});

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
const getUserById = asyncHandler(async (req, res, next) => {
    logger.trace("[userController] :: getUserById() : Start");
  
    try {
      const userId = req.params.id;
  
      const user = await User.findById(userId).select("-password");
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  

      res.status(200).json(user);
    } catch (error) {
      next(error); 
    }
  });

// @desc    create a user
// @route   POST /api/v1/users
// @access  Public
const createUser = asyncHandler(async (req, res) => {
    logger.trace("[userController] :: createUser() : Start");

    const { userName, email, password } = req.body

    if ( !userName || !email || !password ) {
        logger.error("[userController] :: createUser() : Missing required field");
        throw new AppError(400, i18n.__("ERROR_MISSING_REQUIRED_FIELDS"))
    }


    const userNameRegex = /^[^\s]{4,100}$/;
    if (!userNameRegex.test(userName)) {
        logger.error("[userController] :: createUser() : Invalid username format");
        throw new AppError(400, i18n.__("ERROR_INVALID_USERNAME_FORMAT"));
    }

    const userExists = await User.findOne({ userName })

    if (userExists) {
        logger.error("[userController] :: createUser() : Username already exists");
        throw new AppError(400, i18n.__("ERROR_USER_ALREADY_EXISTS"))
    }

    const emailRegex = /^([a-zA-Z0-9_\.-]+)@([a-zA-Z0-9_\.-]+)\.([a-zA-Z]{2,6})$/;

    if (!emailRegex.test(email)) {
        logger.error("[userController] :: createUser() : Invalid email format");
        throw new AppError(400, i18n.__("ERROR_INVALID_EMAIL_FORMAT"));
    }

    const salt = await bcrypt.genSalt(10)
    const hashsedPassword = await bcrypt.hash(password, salt)

    //Create user
    const user = await User.create({
        userName: req.body.userName,
        email: req.body.email,
        password: hashsedPassword,
        status: "NEW"
    })

    //If a new user is created, return user

    if (user) {
        await Alluserpasswords.create({ User: user._id, hashedPasswords: [hashsedPassword] });
        res.status(201).json(user)
    } else {
        logger.error("[userController] :: createUser() : User is not created properly");
        throw new AppError(500, i18n.__("APPLICATION_ERROR"))
    }

    logger.trace("[userController] :: createUser() : End");
})

// @desc    edit a user
// @route   PUT /api/v1/users/:id
// @access  Private
const editUser = asyncHandler(async (req, res) => {
    logger.trace("[projectController] :: editUser() : Start");

    const userId =req.body.userId
    
    if (!userId){
        logger.error("[userController] :: editUser() : user id is a must");
        throw new AppError(400, i18n.__("UNAUTHORIZED"));
    }

    let updates = {
        ...(req.body.userName !== null && req.body.userName != "" && { userName: req.body.userName }),
        ...(req.body.email !== null && req.body.email != "" && { email: req.body.email }),
        ...(req.body.allergens && Array.isArray(req.body.allergens) && { allergens: req.body.allergens }) 
    }

    updates.age = req.body.age;
    updates.weight = req.body.weight;
    updates.height = req.body.height;

    const userNameRegex = /^[^\s]{4,100}$/;
        if (!userNameRegex.test(updates.userName)) {
            logger.error("[userController] :: editUser() : Invalid username format");
            throw new AppError(400, i18n.__("ERROR_INVALID_USERNAME_FORMAT"));
        }


    if (updates.userName !== undefined) {
        const userNameExists = await User.find({
            userName: updates.userName,
            _id: { $ne: currentUser }
        });

        if (userNameExists.length > 0) {
            logger.error("[userController] :: editUser() : Username already exists");
            throw new AppError(400, i18n.__("ERROR_USER_ALREADY_EXISTS"));
        }
    }


    const emailRegex = /^([a-zA-Z0-9_\.-]+)@([a-zA-Z0-9_\.-]+)\.([a-zA-Z]{2,6})$/;
    if (!emailRegex.test(updates.email)) {
        logger.error("[userController] :: editUser() : Invalid email format");
        throw new AppError(400, i18n.__("ERROR_INVALID_EMAIL_FORMAT"));
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })

    if (!updatedUser) {
        logger.error("[userController] :: editUser() : No users with the given id");
        throw new AppError(404, i18n.__("USER_NOT_FOUND"))
    }

    res.status(200).json(updatedUser);
    logger.trace("[userController] :: editUser() : End");
})


// @desc Delete user
// @route DELETE /api/v1/users/:id
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
    logger.trace("[userController] :: deleteUser() : Start");

    const userId = req.params.id;

    const result = await User.deleteOne({ _id: userId })

    if (!result.deletedCount) {
        logger.error("[userController] :: deleteUser() : No users with the given id");
        throw new AppError(404, i18n.__("USER_NOT_FOUND"))
    }
    res.status(200).json({ payload: null, status: Status.getSuccessStatus(i18n.__("DELETE_SUCCESS")) });
    logger.trace("[userController] :: deleteUser() : End");
})




module.exports = {
    createUser,
    editUser,
    deleteUser,
    getUsers,
    getUserById

}