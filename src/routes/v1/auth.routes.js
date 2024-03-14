const express = require('express')
const router = express.Router()
const authController =  require('../../controllers/auth.controller')
 
router.post('/', authController.authenticate)
router.post('/reset-request/', authController.requestPasswordReset)
router.put('/', authController.resetPassword)
router.post('/reset-link-expiry/',authController.resetLinkExpiry)



module.exports = router;
