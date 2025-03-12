const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// Use pug as the template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Limit requests from same IP
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({
    limit: '10kb' // Limit the body size to 10kb
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
// whitelist: An array of properties that are allowed to be
// duplicated in the query string.
app.use(hpp({
    whitelist: [
        'duration',
        'ratingsQuantity',
        'ratingsAverage',
        'maxGroupSize',
        'difficulty',
        'price'
    ]
}));

// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
});

app.get('/', (req, res, next) => {
    res.status(200).render('base', {
        tour: 'The Forest Hiker',
        user: 'Jonas',
    })
})
app.get('/overview', (req, res, next) => {
    res.status(200).render('overview', {
        title: 'All Tours',
    })
})
app.get('/tour', (req, res, next) => {
    res.status(200).render('tour', {
        title: 'The Forest Hiker Tour',
    })
})

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

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
