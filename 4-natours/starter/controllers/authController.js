const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // browser stores cookie, store it and send it along next requests
  };
  if (process.env.NODENV === 'production') {
    cookieOptions.secure = true; // for https
  }
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; // remove password for object sent to client

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide an email or password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

const forgotPassword = catchAsync(async (req, res, next) => {
  // Get user with email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('User does not exist', 404));
  }
  // Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // Send token by email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your password and password confirmation to ${resetURL}\nIf you did not ignore your password, please ignore this email!`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token for 10min',
      message: message,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the reset token email', 500)
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // Set new password if token has not expired and user exists
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // here we *want* to validate
  // Update the changedPasswordAt property

  // Log the user in
  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  // Get the user
  const user = await User.findById(req.user.id).select('+password');
  // Check password is correct
  const { passwordCurrent, password, passwordConfirm } = req.body;
  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('Current password is wrong', 400));
  }
  // Update the Password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();
  // Log the user in
  createSendToken(user, 200, res);
});

const protect = catchAsync(async (req, res, next) => {
  // Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in. Please login to get a token', 401)
    );
  }
  // Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to the token does no longer exist', 401)
    );
  }

  // Check if user changed password after token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please login.', 401)
    );
  }

  req.user = freshUser;
  next();
});

// Only for html pages
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// Only for rendered pages, no errors!
const isLoggedIn = async (req, res, next) => {
  // Getting token and check if it's there
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const freshUser = await User.findById(decoded.id);
      if (!freshUser) {
        return next();
      }

      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = freshUser;
    } catch (err) {
      return next();
    }
  }
  next();
};

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    // req.user exists with `protect` middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  isLoggedIn,
  logout,
  restrictTo,
};
