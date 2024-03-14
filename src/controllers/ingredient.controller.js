const asyncHandler = require('express-async-handler');
const Ingredient = require('../models/ingredient.model');
const logger = require('../utils/log4jsutil.js');
const AppError = require('../utils/app.error');


// @desc    Get expiring ingredients
// @route   GET /api/v1/ingredients
// @access  Public
const getIngredients = asyncHandler(async (req, res) => {
    logger.trace("[ingredientController] :: getIngredient() : Start");

        // Calculate dates for the different expiration thresholds
        const oneDayFromNow = new Date();
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find ingredients and categorize
    const ingredients = await Ingredient.find({
        $or: [
            { expiryDate: { $lte: oneDayFromNow } },
            { expiryDate: { $lte: threeDaysFromNow, $gt: oneDayFromNow } },
            { expiryDate: { $lte: sevenDaysFromNow, $gt: threeDaysFromNow } } 
        ]
    });

    const categorizedIngredients = {
        expiringToday: [],
        expiringIn3Days: [],
        expiringIn7Days: []
    };

    ingredients.forEach(ingredient => {
        if (ingredient.expiryDate <= oneDayFromNow) {
            categorizedIngredients.expiringToday.push(ingredient);
        } else if (ingredient.expiryDate <= threeDaysFromNow) {
            categorizedIngredients.expiringIn3Days.push(ingredient);
        } else {
            categorizedIngredients.expiringIn7Days.push(ingredient);
        }
    });

    if (!categorizedIngredients){
        res.status(200).json("No ingredients expiring within the next 7 days");
    }

    res.status(200).json(categorizedIngredients); 


    logger.trace("[ingredientController] :: getIngredient() : end");
});


// @desc    Create a new ingredient
// @route   POST /api/v1/ingredients
// @access  Public
const createIngredient = asyncHandler(async (req, res) => {
    const { name, quantityInGrams, expiryDate , userId } = req.body;
    

    logger.trace("[ingredientController] :: createIngredient() : Start");

    try {
        // Create the ingredient
        const ingredient = await Ingredient.create({
            userId,
            name,
            quantityInGrams,
            expiryDate
        });

        res.status(201).json(ingredient);
        logger.info(`[ingredientController] :: createIngredient() : Ingredientcreated successfully`);

    } catch (error) {
        logger.error(`[ingredientController] :: createIngredient() : Error creating ingredient: ${error.message}`);
        res.status(500).json({ message: 'Server Error' });  
    }

    logger.trace("[ingredientController] :: createIngredient() : End");
});



// @desc    Update an ingredient
// @route   PUT /api/v1/ingredients/:id
// @access  Public
const updateIngredient = asyncHandler(async (req, res) => {
    const { name, quantityInGrams, expiryDate } = req.body;
    const AppError = require('../utils/app.error'); // Import here

    logger.trace("[ingredientController] :: updateIngredient() : Start");

    try {
        const ingredient = await Ingredient.findById(req.params.id);

        if (!ingredient) {
            logger.warn(`[ingredientController] :: updateIngredient() : Ingredient with ID ${req.params.id} not found`);
            throw new AppError('Ingredient not found', 404); // Throw AppError
        }

        ingredient.name = name;
        ingredient.quantityInGrams = quantityInGrams;
        ingredient.expiryDate = expiryDate;

        await ingredient.save();

        res.status(200).json(ingredient);
        logger.info(`[ingredientController] :: updateIngredient() : Ingredient ${ingredient._id} updated successfully`);


    } catch (error) {
        logger.error(`[ingredientController] :: updateIngredient() : Error updating ingredient: ${error.message}`);

        // Determine appropriate error response (assuming AppError structure)
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message }); 
        } else {
            res.status(500).json({ message: 'Server Error' });
        } 
    }

    logger.trace("[ingredientController] :: updateIngredient() : End");
});

module.exports = {
    getIngredients,
    createIngredient,
    updateIngredient
};