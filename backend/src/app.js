const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const db = require('./models');
const { startCleanupSchedule } = require('./services/cleanupService');

const app = express();
const PORT = process.env.PORT || 3000;

const configuredOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CORS_ORIGINS
].filter(Boolean).flatMap((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean));

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (/^https:\/\/[\w-]+\.github\.io$/.test(origin)) {
      callback(null, true);
    } else if (/^https:\/\/[\w-]+\.pages\.dev$/.test(origin)) {
      callback(null, true);
    } else if (origin.endsWith('.cpolar.top') || origin.endsWith('.cpolar.cn') || origin.endsWith('.cpolar.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', (req, res, next) => {
  const filePath = req.path;
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
    res.setHeader('Content-Type', `image/${ext.substring(1)}`);
    res.setHeader('Content-Disposition', 'inline');
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('公出审批系统 API');
});

async function startServer() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startCleanupSchedule();
  });
}

startServer();
