const express = require('express')
const router = express.Router()
const authController =  require('../../controllers/auth.controller')
 
router.post('/', authController.authenticate)
router.post('/reset-request/', authController.requestPasswordReset)
router.post('/otp/', authController.OTPcheck)



module.exports = router;
