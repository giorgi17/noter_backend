const expect = require('chai').expect;
const sinon = require('sinon');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const User = require('../../models/user');
const userController = require('../../controllers/user');
const userValidation = require('../../validations/user');
const TEST_DB_URL = process.env.TEST_DB_URL;

describe('User controller', () => {
  before(async () => {
    await mongoose.connect(TEST_DB_URL);
  });
  after(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Register', () => {
    after(async () => {
      await User.deleteMany({});
    });

    it('should throw an error if validation fails', async () => {
      const req = {
        body: {
          email: 'testNotEmail.com',
          password: 'wro',
          name: 'Test',
        },
      };

      for (const validationMethod of userValidation.signup) {
        await validationMethod(req, {}, () => {});
      }
      const result = await userController.signup(req, {}, () => {});

      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 422);
      expect(result.message).to.equal('Validation failed.');
    });

    it('should throw an error with code 500 if saving new user to the database fails', async () => {
      const saveStub = sinon.stub(User.prototype, 'save');
      saveStub.throws();

      const req = {
        body: {
          email: 'test@test.com',
          password: 'tester',
          name: 'Test',
        },
      };

      const result = await userController.signup(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);

      saveStub.restore();
    });

    it('should send data if register was successful', async () => {
      const req = {
        body: {
          email: 'test@test.com',
          password: 'tester',
          name: 'Test',
        },
      };
      const res = {
        statusCode: 500,
        message: null,
        userId: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.message = data.message;
          this.userId = data.userId;
        },
      };

      await userController.signup(req, res, () => {});
      expect(res.statusCode).to.equal(201);
      expect(res.message).to.be.a('string');
    });
  });

  describe('Login', () => {
    before(async () => {
      const hashedPw = await bcrypt.hash('tester', 12);

      const user = new User({
        _id: '5c0f66b979af55031b34728a',
        email: 'test@test.com',
        password: hashedPw,
        name: 'Test',
        posts: [],
      });
      await user.save();
    });

    it('should throw an error with code 500 if accessing the database fails', async () => {
      sinon.stub(User, 'findOne');
      User.findOne.throws();

      const req = {
        body: {
          email: 'test@test.com',
          password: 'tester',
        },
      };

      const result = await userController.login(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);

      User.findOne.restore();
    });

    it('should throw an error if a user with this email was not found', async () => {
      const req = {
        body: {
          email: 'testWrong@test.com',
          password: 'tester',
        },
      };

      const result = await userController.login(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.message).to.equal(
        'A user with this email could not be found.'
      );
    });

    it('should throw an error if user password is incorrect', async () => {
      const req = {
        body: {
          email: 'test@test.com',
          password: 'testerWrong',
        },
      };

      const result = await userController.login(req, {}, () => {});
      expect(result).to.be.an('error');
      expect(result.message).to.equal('Wrong password!');
    });

    it('should send data if login was successful', async () => {
      const req = {
        body: {
          email: 'test@test.com',
          password: 'tester',
        },
      };
      const res = {
        statusCode: 500,
        token: null,
        userId: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.token = data.token;
          this.userId = data.userId;
        },
      };

      await userController.login(req, res, () => {});
      expect(res.statusCode).to.equal(200);
      expect(res.token).to.be.a('string');
      expect(res.userId).to.be.a('string');
    });
  });
});
