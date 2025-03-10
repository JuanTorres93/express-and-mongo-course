const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// DOC: mergeParams is needed to access the tourId in the reviewRouter
// This is because by default a router only has access to its own parameters
const router = express.Router({
  mergeParams: true
});

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;