'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

let isConnected = false;
let isListenerAttached = false;

/**
 * Kết nối Mongoose đến MongoDB Atlas.
 * Singleton pattern
 */
async function connectDB() {
  if (isConnected) {
    logger.info('MongoDB: đã kết nối, reuse connection');
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  if (!isListenerAttached) {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB: kết nối thành công');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB: lỗi kết nối');
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB: mất kết nối');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB: kết nối lại thành công');
      isConnected = true;
    });

    isListenerAttached = true;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,  // timeout 5s nếu không tìm được server
    socketTimeoutMS: 45000,          // timeout 45s cho mỗi operation
  });
}

/**
 * Đóng kết nối MongoDB (dùng khi shutdown gracefully).
 */
async function closeDB() {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB: đã đóng kết nối');
  }
}

/**
 * Kiểm tra trạng thái kết nối (dùng cho /health endpoint).
 * readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
 */
function getDBStatus() {
  return mongoose.connection.readyState === 1 ? 'ok' : 'error';
}

module.exports = { connectDB, closeDB, getDBStatus };
