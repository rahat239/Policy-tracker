require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const monitorRoutes = require('./routes/monitors');
const { runCrawler } = require('./lib/crawler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/refund', (req, res) => res.sendFile(path.join(__dirname, 'public', 'refund.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(__dirname, 'public', 'blog.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/blog/:slug', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'blog', `${req.params.slug}.html`);
  res.sendFile(filePath, err => {
    if (err) res.status(404).send('Post not found');
  });
});

cron.schedule('*/15 * * * *', async () => {
  try { await runCrawler(); } catch (err) { console.error('Crawler error:', err.message); }
});

setTimeout(() => { runCrawler().catch(console.error); }, 5000);

app.listen(PORT, () => {
  console.log(`WatchDiff server running on http://localhost:${PORT}`);
});

module.exports = app;
