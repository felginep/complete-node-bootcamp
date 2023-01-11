const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const filterObj = require('../utils/filterObj');
const factory = require('./handlerFactory');

const setTourUserIds = (req, res, next) => {
  const filteredBody = filterObj(req.body, 'review', 'rating', 'tour');
  // Allow nested route
  if (!filteredBody.tour) {
    filteredBody.tour = req.params.tourId;
  }
  filteredBody.user = req.user.id;
  req.body = filteredBody;
  next();
};

const restrictReview = catchAsync(async (req, res, next) => {
  const { user, tour } = req.body;
  if (!tour) {
    return next(new AppError('Tour id is not specified', 400));
  }

  const bookings = await Booking.find({ user, tour });
  if (bookings.length === 0) {
    return next(new AppError("You can't review tour you did not purchase"));
  }
  next();
});

const getAllReviews = factory.getAll(Review);
const getReview = factory.getOne(Review);
const createReview = factory.createOne(Review);
const deleteReview = factory.deleteOne(Review);
const updateReview = factory.updateOne(Review);

module.exports = {
  getAllReviews,
  getReview,
  createReview,
  deleteReview,
  updateReview,
  setTourUserIds,
  restrictReview,
};
