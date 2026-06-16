import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';

import { reindexCustomers } from './utils/reindexer.js';
import { reindexEmployees } from './utils/employeeReindexer.js';

dotenv.config();

// Connect to database and run startup migrations
connectDB().then(() => {
  reindexCustomers();
  reindexEmployees();
});

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      // 'https://crm-project-git-main-p-susmita22s-projects.vercel.app',
      'https://crm-project-ten-green.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Allow any vercel.app subdomain (covers preview deployments)
    const isVercel = origin.endsWith('.vercel.app');
    const isAllowed = allowedOrigins.includes(origin) || isVercel;

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import workRoutes from './routes/workRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Base Route
app.get('/', (req, res) => res.send('API is running...'));
// Health check / keep-alive ping (prevents Render free tier from sleeping)
app.get('/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/work-submissions', workRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
