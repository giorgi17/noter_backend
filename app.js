const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const requestLogger = require('./middlewares/requestLogger');
const rateLimit = require('express-rate-limit');
const swaggerConfig = require('./config/swagger/swaggerConfig');
const swaggerUI = require('swagger-ui-express');
require('dotenv').config({ path: './config.env' });
const multerConfig = require('./config/multerConfig');
const multer = require('multer');

const logger = require('./utils/logger');

const app = express();

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DB_URL;

// Swagger docs
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerConfig));

// Routes
const feedRoutes = require('./routes/feed');
const userRoutes = require('./routes/user');

// Setting up parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  multer({
    storage: multerConfig.fileStorage,
    fileFilter: multerConfig.fileFilter,
  }).single('image')
);

app.use('/images', express.static(path.join(__dirname, 'images')));

// Allowing headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTION'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  next();
});

app.use(requestLogger);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Applying routes
app.use('/feed', feedRoutes);
app.use('/user', userRoutes);

// Error handling
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(statusCode).json({ message, data });
});

mongoose
  .connect(DB_URL)
  .then(result => {
    console.log('Connected to the database!');
    logger.info('Connected to the database!');
    const server = app.listen(PORT);

    const io = require('./config/socket').init(server);
    io.on('connection', stream => {
      console.log('Socket.io - Client connected!');
      logger.info('Socket.io - Client connected!');
    });
  })
  .catch(err => logger.error(err));
