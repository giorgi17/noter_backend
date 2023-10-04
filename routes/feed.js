const express = require('express');
const isAuth = require('../middlewares/is-auth');

const router = express.Router();

const feedController = require('../controllers/feed');
const validation = require('../validations/feed');

router.post('/note', isAuth, validation.createNote, feedController.createNote);

router.get('/notes', isAuth, validation.getNotes, feedController.getNotes);

router.get('/note/:noteId', isAuth, validation.getNote, feedController.getNote);

router.patch(
  '/note/:noteId',
  isAuth,
  validation.updateNote,
  feedController.updateNote
);

router.delete(
  '/note/:noteId',
  isAuth,
  validation.delete,
  feedController.deleteNote
);

router.get(
  '/search',
  isAuth,
  validation.searchNote,
  feedController.searchNotes
);

module.exports = router;
