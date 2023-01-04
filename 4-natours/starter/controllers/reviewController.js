const Review = require('../models/reviewModel');
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
};
