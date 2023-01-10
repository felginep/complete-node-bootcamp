const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const bookingController = require('./controllers/bookingController');

const app = express();

app.enable('trust proxy'); // trust proxy with heroku

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Implement CORS
app.use(cors()); // Set Access-Control-Allow-Origin header to *
app.options('*', cors()); // HTTP method OPTION, because for non GET/POST requests, browser will first send an OPTION request to test for validity

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      allowOrigins: ['*'],
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['*'],
        scriptSrc: ["* data: 'unsafe-eval' 'unsafe-inline' blob:"],
      },
    },
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP
const limiter = rateLimit({
  max: 100, // 100 requests of same IP
  windowMs: 60 * 60 * 1000, // per hour
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// Stripe needs the body in raw format, so before parser middlewares
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb',
  })
);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Sanitize data agains NoSQL query injection
app.use(mongoSanitize());

// Sanitize data agains XSS attacks
app.use(xss());

// Prevent parameter pollution (eg remote first sort in query `?sort=duration&sort=price`)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Compress all responses
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/', viewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// If we go to this middleware, route has not been handled before
app.all('*', (req, res, next) => {
  const err = new AppError(`Route not found ${req.originalUrl}`, 404);
  next(err);
});

app.use(globalErrorHandler);

module.exports = app;
