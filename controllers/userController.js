const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// DOC: Multer storage options
//const multerStorage = multer.diskStorage({
//  destination: (req, file, cb) => {
//    // cb is callback function, similar to next() in express
//    // 1st arg: error, 2nd arg: destination folder
//    cb(null, 'public/img/users');
//  },
//  filename: (req, file, cb) => {
//    // Get the file extension from the uploaded file
//    // file.mimetype = image/FORMAT. e.g: image/jpeg
//    const fileExtension = file.mimetype.split('/')[1];
//    // Unique filename: user-<user_id>-<timestamp>.jpeg
//    cb(null, `user-${req.user.id}-${Date.now()}.${fileExtension}`);
//  },
//});

// DOC: Multer memory storage
// This is useful when you want to process the image before
// saving it to the disk
// Saves file in req.file.buffer
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

// DOC: Upload one single file
// photo is the name of the field IN THE FORM that will
// hold the image to upload.
// During the request-response cycle, the image will be
// stored in req.file
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // DOC: Resize the image
  await sharp(req.file.buffer)
    .resize(500, 500) // width, height
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObject[el] = obj[el];
  });

  return newObject;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // Add photo field if exists for updating in DB
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  // option {new: true} returns the updated document, and not the old one
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
