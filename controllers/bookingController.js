const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  // 2) Create checkout session
  // DOC: Create a new stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    // REQUIRED
    payment_method_types: ['card'],
    // REQUIRED when using prices
    mode: 'payment',
    // REQUIRED URL that will be called once the payment is successful
    // IMPORTANT NOTE: The query params are just a workaround until the
    // page has been deployed. THIS IS NOT SECURE. TODO: Change when
    // the application is deployed.
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    // REQUIRED URL that the user goes if he decides to cancel the payment
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    // This is called in a protected route, so we have access to the user object
    customer_email: req.user.email,
    // Allows to pass some data to the session. Once the payment is successful,
    // we will have access to the session again, so when can use the info for
    // database operations. This is the last step in the diagram shown by JONAS and
    // it will only work in deployed applications.
    client_reference_id: req.params.tourId,
    // Details about the product itself
    line_items: [
      // IMPORTANT: The keys of the objects comes from stripe, so we can't
      // make our own keys.
      {
        // The quantity of the product
        quantity: 1,
        price_data: {
          // The currency to use
          currency: 'usd',
          // unit_amount is the price IN CENTS of the product being purchased
          unit_amount: tour.price * 100,
          product_data: {
            // Name of the product
            name: `${tour.name} Tour`,
            // Description of the product
            description: tour.summary,
            // images must be light weight and hosted. (Deployed application)
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });

  // 3) Send it to the client
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // TODO Change this workaround when the application is deployed
  // Right now everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour || !user || !price) return next();

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
