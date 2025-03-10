const mongoose = require('mongoose');
const Tour = require('./tourModel');

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

// DOC static method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  console.log(stats);

  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating,
  });
}

reviewSchema.post('save', function () {
  // this points to the current review

  // this.constructor points to the model, so it can
  // call the static method
  this.constructor.calcAverageRatings(this.tour);
})

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;