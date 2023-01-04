const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// mergeParams to access parameters from parent route (here tourRouter)
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.createReview
  );

module.exports = router;
