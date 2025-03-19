const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // DOC: Check if the uploaded file is an image, otherwise reject it
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// DOC: Upload multiple files
// will be available in req.files
// If there would be one one field that allows multiple files,
// use upload.array('nameOfField', maxNumberOfFiles)
// e.g. upload.array('images', 3)
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // TODO DELETE THESE DEBUG LOGS
  console.log('req.files');
  console.log(req.files);
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    {
      $group: {
        // field to group by
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      // Here it must be used the field name from the previous stage
      $sort: { minPrice: 1 }, // 1 menas ascending order
    },
    // stages can be repeated
    //{
    //  // _id here is the difficulty because it was the field used in the previous stages
    //  $match: { _id: { $ne: 'easy' } },
    //},
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      // destructure the startDates array
      // In this case, it will create a new document for
      // each element in the startDates array
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numToursStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numToursStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  // distance is divided by the radius of the Earth
  // Earth radius in mi: 3963.2
  // Earth radius in km: 6378.1
  // It is needed because mongodb expects the distance in radians
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    // For geospatial queries, it is needed to create an index
    // in the field. In this case, statLocation is the field
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius],
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  // geoNear returns values in meters
  // To convert to km, multiply by 0.001
  // To convert to miles, multiply by 0.000621371
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      // $geoNear always must be the first stage
      // It also requires a geospatial index
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        // name of the field that will be created
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
