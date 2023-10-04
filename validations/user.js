const { body } = require('express-validator');

const User = require('../models/user');

exports.signup = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .custom(async (value, { req }) => {
      const foundUser = await User.findOne({ email: value });
      if (foundUser) {
        return Promise.reject('E-Mail address already exist!');
      }
    })
    .normalizeEmail(),
  body('password').trim().isLength({ min: 5 }),
  body('name').trim().not().isEmpty(),
];

exports.login = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .normalizeEmail(),
  body('password').trim().isLength({ min: 5 }),
];
