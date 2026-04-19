const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const PORT = process.env.PORT || 8000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SipSync API',
      version: '1.0.0',
      description: 'API cho hệ sinh thái đặt hàng trà sữa',
    },
    servers: [
      { url: `http://localhost:${PORT}` },
    ],
    tags: [
      { name: 'Menu' },
      { name: 'Order' },
      { name: 'Cart' },
      { name: 'Payment' },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/modules/**/*.route.js',
  ],
};

const specs = swaggerJsdoc(options);

// export ra 1 function
const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};

module.exports = setupSwagger;