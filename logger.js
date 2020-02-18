const winston = require('winston');

const format = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
);

const logger = winston.createLogger({
  levels: {
    debug: 0,
    info: 1,
  },
  transports: [
    new winston.transports.Console({
      format
    })
  ]
});

winston.addColors({
  debug: 'red',
  info: 'yellow'
});

module.exports = logger;