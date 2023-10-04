const winston = require('winston');
require('winston-daily-rotate-file');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info =>
      `TIME - ${info.timestamp}, LEVEL - ${info.level}, MESSAGE - ${info.message}`
  )
);

const transports = [
  new winston.transports.DailyRotateFile({
    filename: 'logs/error/error-%DATE%.log',
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/info/info-%DATE%.log',
    level: 'info',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/all/all-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
  }),
];

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;
