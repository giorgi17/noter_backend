const express = require('express');

const userController = require('../controllers/user');
const validation = require('../validations/user');

const router = express.Router();

router.post('/signup', validation.signup, userController.signup);

router.post('/login', validation.login, userController.login);

module.exports = router;
