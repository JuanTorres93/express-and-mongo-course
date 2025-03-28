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

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');

const app = express();
// DOC: This is used to trust proxies. It is for heroku.
// I'm leaving it here for future reference, but I'm using
// another provider.
app.enable('trust proxy');

// Use pug as the template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARES
// Implement CORS
// CORS for simple requests: GET, POST
app.use(cors()); // Access-Control-Allow-Origin *

// CORS for complex requests
// they include DELETE, PATCH, PUT, etc.
app.options('*', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// IMPORTANT. Do NOT use this in production.
// I have included it because the packages in the course
// are outdated. If not included I can't login.
// I don't consider this an important issue because in
// my project I have a working and secure login system.
// I have included it for me to be able to continue the course.

// app.use((req, res, next) => {
// res.set('Content-Security-Policy', 'connect-src *');
// next();
// });

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// The webhookCheckout function expects the body to be
// in raw format (because is the Stripe implementation).
// So we this endpoint here, before the body parser
// middleware, to get the raw body.
app.post(
  '/webhook-checkout',
  // Parse the body
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb', // Limit the body size to 10kb
  })
);
// This middleware is used to parse data from the URL-encoded
// form bodies. It is used to parse data from forms
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);
// Parse data from cookies
// Accessed by req.cookies
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
// whitelist: An array of properties that are allowed to be
// duplicated in the query string.
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

// Compress the TEXT sent to clients
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handle unhandled routes
app.all('*', (req, res, next) => {
  // Whenever you pass an argument to the next() function,
  // Express will assume that it is an error, and it will
  // skip all the other middlewares in the middleware
  // stack and send this error to the global error handling
  // middleware.
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
