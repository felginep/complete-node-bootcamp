const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const filterObj = require('../utils/filterObj');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, callback) => {
//     callback(null, 'public/img/users');
//   },
//   filename: (req, file, callback) => {
//     const extension = file.mimetype.split('/')[1];
//     callback(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//   },
// });
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
  } else {
    callback(
      new AppError('Not an image, please only upload images', 400),
      false
    );
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadUserPhoto = upload.single('photo');

const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // filename is not defined for buffers (memory storage)
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/users/${req.file.filename}`);

  next();
});

const updateMe = catchAsync(async (req, res, next) => {
  // Create error if user tries to update the password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Use the correct route to update password. Please use /updatePassword',
        400
      )
    );
  }
  // Filter out unwanted fields
  const filteredBody = filterObj(req.body, 'name', 'email');

  // Add photo if needed
  if (req.file) {
    filteredBody.photo = req.file.filename;
  }

  // Update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // returns new object
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// To allow for nested GET bookings
const injectUserIdIfNeeded = (req, res, next) => {
  if (req.params.userId && !req.query.user) {
    req.query.user = req.params.userId;
  }
  next();
};

const getAllUsers = factory.getAll(User);
const getUser = factory.getOne(User);
const createUser = factory.createOne(User);
const updateUser = factory.updateOne(User);
const deleteUser = factory.deleteOne(User);

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadUserPhoto,
  resizeUserPhoto,
  updateMe,
  deleteMe,
  getMe,
  injectUserIdIfNeeded,
};
