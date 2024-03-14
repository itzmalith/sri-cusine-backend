const mongoose = require('mongoose')

const userPasswordResetSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    resetExpiryTime: {
        type: Date,
        required: true
    },
    otp: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('UserPasswordResetModel', userPasswordResetSchema)