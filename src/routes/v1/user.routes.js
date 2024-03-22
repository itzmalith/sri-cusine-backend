const express = require('express')
const router = express.Router()
const userController = require('../../controllers/user.controller')


router.post('/',  userController.createUser)
router.get('/',  userController.getUsers)
router.put('/', userController.editUser)
router.delete('/:id', userController.deleteUser)
router.get('/:id', userController.getUserById);
// router.post('/login/',userController.loginUser)
// router.post('/reset-request/' ,userController.requestPasswordReset)
// router.post('/reset', userController.resetPassword)

module.exports = router;