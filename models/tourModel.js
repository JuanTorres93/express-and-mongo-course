const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a name'],
    unique: true,
  },
  slug: String,
  duration: {
    type: Number,
    required: [true, 'A tour must have a duration'],
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'A tour must have a group size'],
  },
  difficulty: {
    type: String,
    required: [true, 'A tour must have a difficulty'],
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
  },
  priceDiscount: Number,
  summary: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a summary'],
  },
  description: {
    type: String,
    trim: true,
  },
  imageCover: {
    type: String,
    default: 'default.jpg',
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    // Do not show this field in the output
    select: false,
  },
  startDates: [Date],
}, {
  toJSON: { virtuals: true }, // enable virtual properties in the output
  toObject: { virtuals: true }, // enable virtual properties in the output
});

// Virtual properties are not persisted to the database.
// They seem to be something like views in SQL.
// IMPORTANT MUST be used a regular function, not an arrow function.
// Arrow functions do not get their own 'this' keyword.
// In mongoose, 'this' refers to the document.

// Virtual properties CANNOT be used in queries.
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
})

// Middleware
// pre runs before an event.
// This specific middleware runs before .save() and .create().
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// post runs after an event.
// This specific middleware runs after .save() and .create().
tourSchema.post('save', function (doc, next) {
  // doc is the document that was saved
  // console.log(doc);
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;