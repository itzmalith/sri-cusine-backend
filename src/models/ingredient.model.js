const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    name: {
        type: String,
        required: true
    },
    quantityInGrams: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    }
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;
