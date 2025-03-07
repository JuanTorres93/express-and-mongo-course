const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'Review cannot be empty'],
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

reviewSchema.pre(/^find/, function (next) {
  // NOTE: Use uncommented code due to design choices
  //this.populate({
  //  path: 'tour',
  //  select: 'name',
  //}).populate({
  //  path: 'tour',
  //  select: 'name photo',
  //});

  this.populate({
    path: 'tour',
    select: 'name photo',
  });

  next()
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;