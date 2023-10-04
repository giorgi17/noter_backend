const { body, query, param } = require('express-validator');

exports.createNote = [
  body('title').trim().isLength({ min: 5 }),
  body('content').trim().isLength({ min: 5 }),
];

exports.getNotes = [query('page').isInt(), query('perPage').isInt()];

exports.getNote = [
  param('noteId').trim().isString().isLength({ min: 24, max: 24 }),
];

exports.updateNote = [
  param('noteId').trim().isString().isLength({ min: 24, max: 24 }),
  body('title').trim().isLength({ min: 5 }),
  body('content').trim().isLength({ min: 5 }),
];

exports.delete = [
  param('noteId').trim().isString().isLength({ min: 24, max: 24 }),
];

exports.searchNote = [query('perPage').isInt(), query('page').isInt()];
