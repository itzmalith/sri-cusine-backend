const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String
    },
    age:{
        type : Number
    },
    weight:{
        type :Number
    },
    height:{
        type : Number
    },
    allergens: [{
        type: String
    }],
    resetPasswordToken: {
        type :String
    },
    status: {
        type: String
    },
    resetPasswordExpires: {
        type :Date
    },
    
})

module.exports = mongoose.model('User', userSchema)