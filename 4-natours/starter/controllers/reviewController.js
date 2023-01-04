const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const filterObj = require('../utils/filterObj');

const getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.tourId) {
    filter = { tour: req.params.tourId };
  }
  const reviews = await Review.find(filter);
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews },
  });
});

const createReview = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, 'review', 'rating', 'tour');
  // Allow nested route
  if (!filteredBody.tour) {
    filteredBody.tour = req.params.tourId;
  }
  filteredBody.user = req.user.id;
  const newReview = await Review.create(filteredBody);
  res.status(201).json({
    status: 'success',
    data: { review: newReview },
  });
});

module.exports = { getAllReviews, createReview };
