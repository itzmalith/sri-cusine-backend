const express = require('express')
const router = express.Router()
const ingredientController = require('../../controllers/ingredient.controller')

router.post('/',ingredientController.createIngredient )
router.post('/get/',  ingredientController.getIngredients)
router.put('/:id', ingredientController.updateIngredient)
router.post('/batch', ingredientController.createIngredientBatch)

module.exports = router;