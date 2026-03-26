const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

async function signup(req, res, next) {
  try {
    const rawEmail = typeof req.body.email === 'string' ? req.body.email : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const email = validator.normalizeEmail(rawEmail) || '';
    if (!validator.isEmail(email)) {
      throw new AppError('Invalid email', 400);
    }
    if (password.length < 8 || password.length > 128) {
      throw new AppError('Password must be 8–128 characters', 400);
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hash });
    const token = signToken(user);
    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id.toString(), email: user.email, createdAt: user.createdAt },
      },
    });
  } catch (e) {
    if (e.code === 11000) {
      return next(new AppError('Email already registered', 409));
    }
    return next(e);
  }
}

async function login(req, res, next) {
  try {
    const rawEmail = typeof req.body.email === 'string' ? req.body.email : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const email = validator.normalizeEmail(rawEmail) || '';
    if (!validator.isEmail(email)) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = signToken(user);
    return res.json({
      success: true,
      data: {
        token,
        user: { id: user._id.toString(), email: user.email, createdAt: user.createdAt },
      },
    });
  } catch (e) {
    return next(e);
  }
}

async function me(req, res) {
  return res.json({
    success: true,
    data: { user: { id: req.user.id, email: req.user.email } },
  });
}

module.exports = { signup, login, me };
