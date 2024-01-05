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
    body('name').trim().not().isEmpty(),
    body(
        'password',
        'Please enter a password with only numbers and text and at least 5 characters.'
    )
        .isLength({ min: 5 })
        .isAlphanumeric()
        .trim(),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords have to match!');
            }
            return true;
        })
        .trim(),
];

exports.login = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .normalizeEmail(),
    body('password').trim().isLength({ min: 5 }),
];
