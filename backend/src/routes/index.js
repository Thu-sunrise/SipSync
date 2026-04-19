'use strict';

const express = require('express');

const healthRoute = require('./health.route');
const metricsRoute = require('./metrics.route');
const orderRouter = require('../modules/order/order.route');
const cartRouter = require('../modules/cart/cart.route');
const menuRouter = require('../modules/menu/menu.route');
const aiRouter = require('../modules/ai/ai.route');
const paymentRouter = require('../modules/payment/payment.route');
const botRouter = require('../modules/bot/bot.route');
const authRouter = require('../modules/auth/auth.route');

const router = express.Router();
router.use('/auth', authRouter);
router.use('/bot', botRouter);
router.use('/ai', aiRouter);
router.use('/cart', cartRouter);
router.use('/order', orderRouter);
router.use('/menu', menuRouter);
router.use('/webhook', paymentRouter);   // POST /webhook/payos
router.use('/webhook', botRouter);       // POST /webhook/telegram
router.use(healthRoute);
router.use(metricsRoute);

module.exports = router;
