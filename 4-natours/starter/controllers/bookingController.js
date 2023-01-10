const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const getCheckoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/my-tours?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              'https://thumbs.dreamstime.com/b/hiking-forest-man-morning-mist-travel-concept-45457025.jpg',
            ],
          },
          unit_amount: tour.price * 100, // in cents
          currency: 'usd',
        },
        quantity: 1,
      },
    ],
  });
  res.status(200).json({
    status: 'success',
    session,
  });
});

// const createBookingCheckout = catchAsync(async (req, res, next) => {
//   const { tour, user, price } = req.query;
//   if (!tour || !user || !price) {
//     return next();
//   }
//   await Booking.create({ tour, user, price });
//   res.redirect(req.originalUrl.split('?')[0]); // hide parameters
// });

const createBookingCheckout = async (session) => {
  const tourId = session.client_reference_id;
  const user = await User.findOne({ email: session.customer_email });
  const price = session.line_items[0].price_data.unit_amount / 100;
  await Booking.create({
    tour: tourId,
    user: user.id,
    price,
  });
};

const webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

const getAllBookings = factory.getAll(Booking);
const getBooking = factory.getOne(Booking);
const createBooking = factory.createOne(Booking);
const deleteBooking = factory.deleteOne(Booking);
const updateBooking = factory.updateOne(Booking);

module.exports = {
  getCheckoutSession,
  // createBookingCheckout,
  webhookCheckout,
  getAllBookings,
  getBooking,
  createBooking,
  deleteBooking,
  updateBooking,
};
