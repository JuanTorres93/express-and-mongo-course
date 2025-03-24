const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
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
    // page has been deployed. THIS IS NOT SECURE.
    //success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //  req.params.tourId
    //}&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
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
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${
                tour.imageCover
              }`,
            ],
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

// DOC: Workaround to use Stripe in development
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // TODO Change this workaround when the application is deployed
//   // Right now everyone can make bookings without paying
//   const { tour, user, price } = req.query;
//
//   if (!tour || !user || !price) return next();
//
//   await Booking.create({ tour, user, price });
//
//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
  // Get the session that was created at the moment of
  // starting the checkout process
  // .client_reference_id was specified in the creation of the session
  // TODO DELETE THESE DEBUG LOGS
  console.log('session after payment completed');
  console.log(session);

  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;

  await Booking.create({ tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
  // When stripe calls a webhook, it will add a header
  // containing a signature for our webhook

  // TODO DELETE THESE DEBUG LOGS
  console.log('WEBHOOK');

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // DOC: body needs to be in raw format
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // TODO DELETE THESE DEBUG LOGS
    console.log('event');
    console.log(event);
  } catch (error) {
    // TODO DELETE THESE DEBUG LOGS
    console.log('error');
    console.log(error);
    // Send error to Stripe
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // The type is specified in the Stripe webapp,
  // when creating the webhook
  if (event.type === 'checkout.session.completed') {
    // Create booking in database
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
