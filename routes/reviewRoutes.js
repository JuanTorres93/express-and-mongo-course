const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// DOC: mergeParams is needed to access the tourId in the reviewRouter
// This is because by default a router only has access to its own parameters
const router = express.Router({
  mergeParams: true
});


router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(authController.protect,
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview);

router
  .route('/:id')
  .patch(authController.protect,
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview)
  .delete(authController.protect,
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview);

module.exports = router;