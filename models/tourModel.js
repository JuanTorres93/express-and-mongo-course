const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a name'],
    unique: true,
    maxLength: [40, 'A tour name must have less or equal than 40 characters'],
    minLength: [10, 'A tour name must have more or equal than 10 characters'],
    // validate: [validator.isAlpha, 'Tour name must only contain characters'],
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
    enum: {
      values: ['easy', 'medium', 'difficult'],
      message: 'Difficulty is either: easy, medium, difficult',
    },
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
  },
  priceDiscount: {
    type: Number,
    validate: {
      validator: function (val) {
        // 'this' only points to the current document 
        // on NEW document creation.
        return val < this.price;
      },
      message: 'Discount price ({VALUE}) should be below the regular price',
    },
  },
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
  secretTour: {
    type: Boolean,
    default: false,
  },
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

// Query middleware
tourSchema.pre(/^find/, function (next) {
  // this points to the query object
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  // docs is the documents that were found
  // console.log(docs);
  next();
});

// Aggregation middleware
tourSchema.pre('aggregate', function (next) {
  // this points to the aggregation object
  // unshift adds an element to the beginning of an array
  // This effectively adds a new stage to the beginning of the pipeline
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } }
  });
  next()
});


const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;