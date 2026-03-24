import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/user.js';
import serviceRoutes from './src/routes/services.js';
import orderRoutes from './src/routes/orders.js';
import fundsRoutes from './src/routes/funds.js';
import adminRoutes from './src/routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:5173', 'https://webbuffmxh.vercel.app'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/funds', fundsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
