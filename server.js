const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const seedData = require('./config/seed');

// Load environment variables
dotenv.config();

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/counters', require('./routes/counterRoutes'));
app.use('/api/tokens', require('./routes/tokenRoutes'));

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/user-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'user-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'display.html'));
});

// Fallback for 404
app.use((req, res) => {
  if (req.accepts('html')) {
    res.redirect('/');
  } else {
    res.status(404).json({ success: false, message: 'Resource not found' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedData();

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 QueueLess Server Running at: http://localhost:${PORT}`);
      console.log(`👤 User Dashboard:             http://localhost:${PORT}/user-dashboard`);
      console.log(`🛡️ Admin Dashboard:            http://localhost:${PORT}/admin-dashboard`);
      console.log(`📺 Live Display Board:          http://localhost:${PORT}/display`);
      console.log(`🔑 Login Page:                  http://localhost:${PORT}/login`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();
