const express = require('express')
const router = express.Router()

const userRoutes = require('./user.routes')
const ingredientRoutes = require('./ingredients.routes')
const authRoutes = require('./auth.routes')

router.use('/users', userRoutes)
router.use('/ingredients', ingredientRoutes)
router.use('/auth' , authRoutes)
module.exports = router