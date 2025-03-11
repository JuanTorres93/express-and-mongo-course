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
    // Function that runs each time a new value is set for this field
    set: val => Math.round(val * 10) / 10, // 4.6666 -> 46.666 -> 47 -> 4.7
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
  startLocation: {
    // GeoJSON
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'], // GeoJSON has multiple types, but we allow only Point
    },
    coordinates: [Number], // [longitude, latitude]
    address: String,
    description: String,
  },
  // DOC Embedding documents (must be an array)
  locations: [
    {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], // GeoJSON has multiple types, but we allow only Point
      },
      coordinates: [Number], // [longitude, latitude]
      address: String,
      description: String,
      day: Number,
    }
  ],
  // DOC Referencing documents, first step
  guides: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }
  ],
}, {
  toJSON: { virtuals: true }, // enable virtual properties in the output
  toObject: { virtuals: true }, // enable virtual properties in the output
});

// DOC create indexes for field names.
// 1 means ascending order, -1 means descending order.
tourSchema.index({ slug: 1 });
// DOC compound index. When creating a compound index,
// it will also work for the individual fields. So it is 
// not necessary to create an index for each field.
tourSchema.index({ price: 1, ratingsAverage: -1 });

// DOC Geospatial index
// This is needed to make geospatial queries.
// 2dsphere is the type of index for geospatial data.
tourSchema.index({ startLocation: '2dsphere' });

// DOC Virtual properties are not persisted to the database.
// They seem to be something like views in SQL.
// IMPORTANT MUST be used a regular function, not an arrow function.
// Arrow functions do not get their own 'this' keyword.
// In mongoose, 'this' refers to the document.

// Virtual properties CANNOT be used in queries.
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
})

// DOC: Virtual populate is a way to make a parent 
// document aware of its children.
// It is not enough to just specify the virtual here
// we also need to populate it in the query.
tourSchema.virtual('reviews', {
  ref: 'Review',
  // foreignField is the field in the child document that
  // refers to the parent document.
  // it actually stores the id
  foreignField: 'tour',
  // localField is the id of the tour in this document
  localField: '_id',
});

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

tourSchema.pre(/^find/, function (next) {
  // DOC Referencing documents, second and last step
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  })

  next()
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