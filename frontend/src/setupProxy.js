const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: false,
      secure: false,
      ws: false,
      logLevel: 'info',
      // Preserve headers
      headers: {
        'Connection': 'keep-alive',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.url} -> http://127.0.0.1:8000${req.url}`);
        
        // Log important headers
        if (req.headers['x-csrftoken']) {
          console.log(`[Proxy] CSRF token in request header: ${req.headers['x-csrftoken'].substring(0, 20)}...`);
        }
        if (req.headers['x-csrf-token']) {
          console.log(`[Proxy] CSRF token (alt format) in request header: ${req.headers['x-csrf-token'].substring(0, 20)}...`);
        }
        if (req.headers.cookie) {
          const hasCsrf = req.headers.cookie.includes('csrftoken');
          const hasSession = req.headers.cookie.includes('sessionid');
          console.log(`[Proxy] Cookies: CSRF=${hasCsrf}, Session=${hasSession}`);
        }
      },
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
        console.error('[Proxy Error] Make sure Django server is running on http://127.0.0.1:8000');
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Proxy error',
            message: 'Failed to connect to backend server. Make sure Django is running on http://127.0.0.1:8000'
          });
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
        
        // Log Set-Cookie headers if present
        if (proxyRes.headers['set-cookie']) {
          console.log(`[Proxy] Set-Cookie headers:`, proxyRes.headers['set-cookie']);
        }
      },
    })
  );
};

