const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const changesSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const noteHistorySchema = new Schema(
  {
    history: [
      {
        date: { type: Date, default: Date.now },
        changes: {
          title: {
            type: String,
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
        },
      },
    ],
  },
  { collection: 'NoteHistory' }
);

module.exports = mongoose.model('NoteHistory', noteHistorySchema);
