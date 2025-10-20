// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // REST API
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: false, // <-- keep Origin as http://localhost:3000
    })
  );

  // Socket.IO
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      ws: true,            // <-- enable websockets
      changeOrigin: false, // <-- keep Origin as http://localhost:3000
      secure: false,
    })
  );
};
