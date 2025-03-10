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

  if (stats.length !== 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
}

reviewSchema.post('save', function () {
  // this points to the current review

  // this.constructor points to the model, so it can
  // call the static method
  this.constructor.calcAverageRatings(this.tour);
})

// Jonas does the updating with these two middlewares, but
// they can be combined in one. Because the post middleware
// has access to the document that was just saved.
// These two middlewares work together to update the ratings
// when a review is updated 
//reviewSchema.pre(/^findOneAnd/, async function (next) {
//  // this is the current query
//  // get the current review and store it in the query
//  this.r = await this.findOne();
//  console.log(this.r);
//  next();
//});
//
//reviewSchema.post(/^findOneAnd/, async function () {
//  // await this.findOne(); does NOT work here, query has already executed
//
//  // this.r is a review document, so it can access
//  // the model (Review) using .constructor
//  await this.r.constructor.calcAverageRatings(this.r.tour);
//});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  await doc.constructor.calcAverageRatings(doc.tour._id);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;