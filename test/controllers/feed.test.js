const expect = require('chai').expect;
const sinon = require('sinon');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('../../models/user');
const Note = require('../../models/note');
const NoteHistory = require('../../models/noteHistory');
const feedController = require('../../controllers/feed');
const feedValidation = require('../../validations/feed');
const io = require('../../config/socket');
const TEST_DB_URL = process.env.TEST_DB_URL;

describe('Feed controller', () => {
  before(async () => {
    const server = await mongoose.connect(TEST_DB_URL);
    io.init(server);
    const user = new User({
      _id: '5c0f66b979af55031b34728a',
      email: 'test@test.com',
      password: 'tester',
      name: 'Test',
      notes: [],
    });
    await user.save();

    const note = new Note({
      _id: '5c0f66b979af55031b34717b',
      title: 'Test note',
      content: 'Test content',
      creator: '5c0f66b979af55031b34728a',
    });
    await note.save();
  });
  after(async () => {
    await User.deleteMany({});
    await Note.deleteMany({});
    await NoteHistory.deleteMany({});
    await mongoose.disconnect();
  });

  describe('createNote', () => {
    it('should throw an error if validation fails', async () => {
      const req = {
        body: {
          title: 'Test Note',
          content: 'dfd',
        },
      };

      for (const validationMethod of feedValidation.createNote) {
        await validationMethod(req, {}, () => {});
      }

      const result = await feedController.createNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal(
        'Validation failed, invalid data was entered!'
      );
    });

    it('should throw an error with code 500 if saving new note to the database fails', async () => {
      const saveStub = sinon.stub(Note.prototype, 'save');
      saveStub.throws();

      const req = {
        body: {
          title: 'Test Note',
          content: 'Test content',
        },
        userId: '5c0f66b979af55031b34728a',
      };

      const result = await feedController.createNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);

      saveStub.restore();
    });

    it('should create a note and add a created note to the notes of the creator', async () => {
      const req = {
        body: {
          title: 'Test Note',
          content: 'A test note',
        },
        userId: '5c0f66b979af55031b34728a',
      };
      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const result = await feedController.createNote(req, res, () => {});
      expect(result).to.have.property('notes');
      expect(result.notes).to.have.length(1);
    });
  });

  describe('getNotes', () => {
    it('should throw an error if validation fails', async () => {
      const req = {
        query: {
          page: 'Test Note',
          perPage: 'dfd',
        },
      };

      for (const validationMethod of feedValidation.getNotes) {
        await validationMethod(req, {}, () => {});
      }

      const result = await feedController.getNotes(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal(
        'Validation failed, invalid data was entered!'
      );
    });

    it('should throw an error with code 500 if getting notes from database fails', async () => {
      sinon.stub(Note, 'find');
      Note.find.throws();
      const req = {
        query: {
          page: 1,
          perPage: 1,
        },
      };

      const result = await feedController.getNotes(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);

      Note.find.restore();
    });

    it('should send fetched notes to the user', async () => {
      const req = {
        query: {
          page: 1,
          perPage: 1,
        },
      };
      const res = {
        statusCode: null,
        message: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.message = data.message;
        },
      };

      await feedController.getNotes(req, res, () => {});
      expect(res.statusCode).to.equal(200);
      expect(res.message).to.equal('Fetched notes successfully.');
    });
  });

  describe('getNote', () => {
    it('should throw an error if validation fails', async () => {
      const req = {
        params: {
          noteId: 2342,
        },
      };

      for (const validationMethod of feedValidation.getNote) {
        await validationMethod(req, {}, () => {});
      }

      const result = await feedController.getNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal(
        'Validation failed, invalid data was entered!'
      );
    });

    it('should throw an error with code 500 if fetching note from database fails', async () => {
      sinon.stub(Note, 'findById');
      Note.findById.throws();

      req = {
        params: {
          noteId: '651839cd939688b432339a76',
        },
      };

      const result = await feedController.getNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);
      Note.findById.restore();
    });

    it('should throw 404 if no note was found with that id', async () => {
      req = {
        params: {
          noteId: '651839cd939688b432339a76',
        },
      };

      const result = await feedController.getNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.statusCode).equals(404);
      expect(result.message).to.equals('Cound not find note.');
    });

    it('should send fetched note to the user', async () => {
      req = {
        params: {
          noteId: '5c0f66b979af55031b34717b',
        },
      };
      const res = {
        statusCode: null,
        message: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.message = data.message;
        },
      };

      await feedController.getNote(req, res, () => {});
      expect(res.statusCode).to.equal(200);
      expect(res.message).to.equal('Note fetched.');
    });
  });

  describe('updateNote', () => {
    before(async () => {
      const noteHistory = new NoteHistory({
        history: [
          {
            changes: {
              title: 'First edit title',
              content: 'First edit content',
            },
          },
        ],
      });
      await noteHistory.save();

      const note = new Note({
        _id: '6519d538128c5f4464efe4d2',
        title: 'Test note',
        content: 'Test content',
        creator: '5c0f66b979af55031b34728a',
        noteHistory: noteHistory._id,
      });

      await note.save();
    });

    it('should throw an error if validation fails', async () => {
      const req = {
        params: {
          noteId: 23423,
        },
        body: {
          title: 'test',
          content: 'test',
        },
      };

      for (const validationMethod of feedValidation.updateNote) {
        await validationMethod(req, {}, () => {});
      }

      const result = await feedController.updateNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal(
        'Validation failed, invalid data was entered!'
      );
    });

    it('should throw an error with code 500 if fetching note from database fails', async () => {
      sinon.stub(Note, 'findById');
      Note.findById.throws();

      const req = {
        params: {
          noteId: 23423,
        },
        body: {
          title: 'test',
          content: 'test',
        },
      };

      const result = await feedController.updateNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);
      Note.findById.restore();
    });

    it('should throw 404 if no note was found with that id', async () => {
      const req = {
        params: {
          noteId: '651839cd939688b432339a76',
        },
        body: {
          title: 'test',
          content: 'test',
        },
      };

      const result = await feedController.updateNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.statusCode).equals(404);
      expect(result.message).to.equals('Cound not find note.');
    });

    it('should throw an error if logged in user is not the owner of the note', async () => {
      const req = {
        params: {
          noteId: '5c0f66b979af55031b34717b',
        },
        body: {
          title: 'test',
          content: 'test',
        },
        userId: '5c0f66b979af55031b34728m',
      };

      const result = await feedController.updateNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.message).to.equal('Not authorized!');
      expect(result.statusCode).to.equal(403);
    });

    it('should create a note history document after successful update', async () => {
      const req = {
        params: {
          noteId: '5c0f66b979af55031b34717b',
        },
        body: {
          title: 'testing title',
          content: 'testing content',
        },
        userId: '5c0f66b979af55031b34728a',
      };
      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const result = await feedController.updateNote(req, res, () => {});
      expect(result.note).to.have.property('noteHistory');
      expect(result.noteHistory.history).to.have.length(2);
    });

    it('should push a new note history data to the existing note history document', async () => {
      const req = {
        params: {
          noteId: '6519d538128c5f4464efe4d2',
        },
        body: {
          title: 'testing title',
          content: 'testing content',
        },
        userId: '5c0f66b979af55031b34728a',
      };
      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const result = await feedController.updateNote(req, res, () => {});
      expect(result.note).to.have.property('noteHistory');
      expect(result.noteHistory.history).to.have.length(2);
    });
  });

  describe('deleteNote', () => {
    before(async () => {
      const user = await User.findById('5c0f66b979af55031b34728a');
      user.notes.push('5c0f66b979af55031b34717b');
      await user.save();
    });

    it('should throw an error if validation fails', async () => {
      const req = {
        params: {
          noteId: 234,
        },
      };

      for (const validationMethod of feedValidation.delete) {
        await validationMethod(req, {}, () => {});
      }

      const result = await feedController.deleteNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal(
        'Validation failed, invalid data was entered!'
      );
    });

    it('should throw an error with code 500 if fetching note from database fails', async () => {
      sinon.stub(Note, 'findById');
      Note.findById.throws();
      const req = {
        params: {
          noteId: 234,
        },
      };

      const result = await feedController.deleteNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);
      Note.findById.restore();
    });

    it('should throw 404 if no note was found with that id', async () => {
      const req = {
        params: {
          noteId: '651839cd939688b432339a76',
        },
      };

      const result = await feedController.deleteNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.statusCode).equals(404);
      expect(result.message).to.equals('Cound not find note.');
    });

    it('should throw an error if logged in user is not the owner of the note', async () => {
      const req = {
        params: {
          noteId: '5c0f66b979af55031b34717b',
        },
        userId: '5c0f66b979af55031b34728m',
      };

      const result = await feedController.deleteNote(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.message).to.equal('Not authorized!');
      expect(result.statusCode).to.equal(403);
    });

    it("should remove deleted note's id from user's document notes array", async () => {
      const req = {
        params: {
          noteId: '5c0f66b979af55031b34717b',
        },
        userId: '5c0f66b979af55031b34728a',
      };
      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const result = await feedController.deleteNote(req, res, () => {});
      expect(result.notes.map(id => id.toString())).to.not.include(
        '5c0f66b979af55031b34717b'
      );
    });
  });

  describe('searchNotes', () => {
    it('should throw an error if validation fails', async () => {
      const req = {
        query: {
          searchText: '',
          page: 'sfds',
          perPage: 3,
        },
      };

      for (const validationMethod of feedValidation.searchNote) {
        await validationMethod(req, {}, () => {});
      }

      const result = await feedController.searchNotes(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal(
        'Validation failed, invalid data was entered!'
      );
    });

    it('should throw an error with code 500 if fetching notes from database fails', async () => {
      sinon.stub(Note, 'find');
      Note.find.throws();
      const req = {
        query: {
          searchText: '',
          page: 'sfds',
          perPage: 3,
        },
      };

      const result = await feedController.searchNotes(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);
      Note.find.restore();
    });

    it('should send fetched notes to user', async () => {
      const req = {
        query: {
          searchText: '',
          page: 1,
          perPage: 1,
        },
      };
      const res = {
        statusCode: null,
        message: null,
        notes: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.message = data.message;
          this.notes = data.notes;
        },
      };

      await feedController.searchNotes(req, res, () => {});
      expect(res.statusCode).to.equal(200);
      expect(res.message).to.equal('Fetched notes successfully.');
      expect(res.notes).to.be.an('array');
    });
  });
});
