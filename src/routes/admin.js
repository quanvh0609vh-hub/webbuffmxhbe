import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/dashboard', async (req, res) => {
  try {
    const [users, orders, revenue, pending, recentUsers, recentOrders] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Transaction.aggregate([{ $match: { status: 'completed', amount: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Order.countDocuments({ status: 'Pending' }),
      User.find().sort({ createdAt: -1 }).limit(5),
      Order.find().populate('userId', 'username email').sort({ createdAt: -1 }).limit(5),
    ]);
    res.json({
      success: true,
      data: {
        stats: { users, orders, revenue: revenue[0]?.total || 0, pending },
        recentUsers: recentUsers.map(u => ({ id: u._id, username: u.username, email: u.email, createdAt: u.createdAt })),
        recentOrders: recentOrders.map(o => ({ id: o._id, orderId: o.orderId, user: o.userId, charge: o.charge, status: o.status })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 15, search } = req.query;
    const query = {};
    if (search) query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    const usersWithCount = await Promise.all(users.map(async (u) => {
      const orderCount = await Order.countDocuments({ userId: u._id });
      return { id: u._id, username: u.username, email: u.email, balance: u.balance, role: u.role, createdAt: u.createdAt, orderCount };
    }));

    res.json({ success: true, data: { users: usersWithCount, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, balance, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    if (username) user.username = username;
    if (email) user.email = email;
    if (balance !== undefined) user.balance = parseFloat(balance);
    if (role) user.role = role;
    await user.save();
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, data: { services } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/services', async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: { service } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Dịch vụ không tồn tại' });
    res.json({ success: true, data: { service } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 15, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [{ link: { $regex: search, $options: 'i' } }, { orderId: { $regex: search, $options: 'i' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query).populate('userId', 'username email').populate('serviceId', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);

    const ordersData = orders.map(o => ({
      id: o._id, orderId: o.orderId, user: o.userId, service: o.serviceId,
      link: o.link, quantity: o.quantity, charge: o.charge, status: o.status, createdAt: o.createdAt,
    }));

    res.json({ success: true, data: { orders: ordersData, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    order.status = status;
    await order.save();
    res.json({ success: true, data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 15, type, status, search } = req.query;
    const query = {};
    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;
    if (search) query.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { note: { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total, depositTotal] = await Promise.all([
      Transaction.find(query).populate('userId', 'username email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Transaction.countDocuments(query),
      Transaction.aggregate([{ $match: { type: 'deposit', status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const txData = transactions.map(t => ({
      _id: t._id, user: t.userId, type: t.type, amount: t.amount,
      paymentMethod: t.paymentMethod, status: t.status, transactionId: t.transactionId,
      note: t.note, referenceCode: t.referenceCode, createdAt: t.createdAt, updatedAt: t.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        transactions: txData,
        pagination: { total, pages: Math.ceil(total / parseInt(limit)), page: parseInt(page) },
        depositTotal: depositTotal[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/transactions/confirm', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const tx = await Transaction.findById(transactionId).populate('userId');
    if (!tx) return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại' });
    if (tx.status !== 'pending') return res.status(400).json({ success: false, message: 'Giao dịch không ở trạng thái chờ' });

    tx.status = 'completed';
    await tx.save();

    if (tx.userId && tx.type === 'deposit') {
      await User.findByIdAndUpdate(tx.userId._id, { $inc: { balance: tx.amount } });
    }

    res.json({ success: true, data: { transaction: tx } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/transactions/cancel', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const tx = await Transaction.findById(transactionId);
    if (!tx) return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại' });
    if (tx.status !== 'pending') return res.status(400).json({ success: false, message: 'Giao dịch không ở trạng thái chờ' });
    tx.status = 'cancelled';
    await tx.save();
    res.json({ success: true, data: { transaction: tx } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin settings (GET/PUT) - returns/persists via env-like config stored in-memory for now
// For a real app, you'd want a dedicated Settings model or config file
const siteSettings = {
  siteName: process.env.SITE_NAME || 'webbuffMXH',
  siteUrl: process.env.SITE_URL || 'https://webbuffmxh.vercel.app',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@webbuffmxh.com',
  minDeposit: parseFloat(process.env.MIN_DEPOSIT || '5'),
  minOrder: parseFloat(process.env.MIN_ORDER || '1'),
  referralBonus: parseFloat(process.env.REFERRAL_BONUS || '5'),
  maintenanceMode: false,
};

router.get('/settings', async (req, res) => {
  res.json({ success: true, data: { settings: siteSettings } });
});

router.put('/settings', async (req, res) => {
  const { siteName, siteUrl, supportEmail, minDeposit, minOrder, referralBonus, maintenanceMode } = req.body;
  if (siteName !== undefined) siteSettings.siteName = siteName;
  if (siteUrl !== undefined) siteSettings.siteUrl = siteUrl;
  if (supportEmail !== undefined) siteSettings.supportEmail = supportEmail;
  if (minDeposit !== undefined) siteSettings.minDeposit = parseFloat(minDeposit);
  if (minOrder !== undefined) siteSettings.minOrder = parseFloat(minOrder);
  if (referralBonus !== undefined) siteSettings.referralBonus = parseFloat(referralBonus);
  if (maintenanceMode !== undefined) siteSettings.maintenanceMode = maintenanceMode;
  res.json({ success: true, data: { settings: siteSettings } });
});

router.post('/seed', async (req, res) => {
  try {
    const { seedServices } = require('../services/seedData.js');
    await seedServices();
    res.json({ success: true, message: 'Dữ liệu mẫu đã được tạo' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
