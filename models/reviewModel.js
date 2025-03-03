const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [True, 'Review cannot be empty'],
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Review must belong to a tour'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user'],
  },
}, {
  toJSON: { virtuals: true }, // enable virtual properties in the output
  toObject: { virtuals: true }, // enable virtual properties in the output
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;