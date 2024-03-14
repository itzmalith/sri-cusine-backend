const mongoose = require('mongoose')


const allUserPasswordsSchema = mongoose.Schema({
    
    User: { type: mongoose.ObjectId, ref: "User" },
    hashedPasswords: [{ type: String }],

}, {
    timestamps: true
})

module.exports = mongoose.model('Alluserpasswords', allUserPasswordsSchema)