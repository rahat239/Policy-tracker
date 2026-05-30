require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const monitorRoutes = require('./routes/monitors');
const { runCrawler } = require('./lib/crawler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser (simple implementation)
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const [key, ...val] = c.trim().split('=');
      req.cookies[key.trim()] = decodeURIComponent(val.join('='));
    });
  }
  const originalCookie = res.cookie.bind(res);
  res.cookie = (name, value, options = {}) => {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options.httpOnly) cookie += '; HttpOnly';
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
    if (options.secure) cookie += '; Secure';
    res.setHeader('Set-Cookie', cookie);
    return res;
  };
  res.clearCookie = (name) => {
    res.setHeader('Set-Cookie', `${name}=; Max-Age=0; HttpOnly; SameSite=lax`);
    return res;
  };
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html') + '#pricing'));

// Cron job — run crawler every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    await runCrawler();
  } catch (err) {
    console.error('Crawler error:', err.message);
  }
});

// Run crawler on startup after 5 seconds
setTimeout(() => {
  runCrawler().catch(console.error);
}, 5000);

app.listen(PORT, () => {
  console.log(`WatchDiff server running on http://localhost:${PORT}`);
});

module.exports = app;
