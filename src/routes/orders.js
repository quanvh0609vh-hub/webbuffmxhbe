import { Router } from 'express';
import Order from '../models/Order.js';
import Service from '../models/Service.js';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/auth.js';
import { calculateCharge } from '../utils/apiHelpers.js';

const router = Router();

router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (search) query.$or = [{ link: { $regex: search, $options: 'i' } }, { orderId: { $regex: search, $options: 'i' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query).populate('serviceId', 'name category').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);

    const ordersData = orders.map(o => ({ ...o.toObject(), service: o.serviceId }));
    res.json({ success: true, data: { orders: ordersData, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const [total, pending, processing, completed] = await Promise.all([
      Order.countDocuments({ userId: req.user._id }),
      Order.countDocuments({ userId: req.user._id, status: 'Pending' }),
      Order.countDocuments({ userId: req.user._id, status: 'Processing' }),
      Order.countDocuments({ userId: req.user._id, status: 'Completed' }),
    ]);
    res.json({ success: true, data: { stats: { totalOrders: total, pendingOrders: pending, processingOrders: processing, completedOrders: completed } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { serviceId, link, quantity } = req.body;
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: 'Dịch vụ không tồn tại' });

    const qty = parseInt(quantity);
    if (qty < service.minOrder || qty > service.maxOrder) {
      return res.status(400).json({ success: false, message: `Số lượng phải từ ${service.minOrder} đến ${service.maxOrder}` });
    }

    const charge = calculateCharge(qty, service.pricePer1k);
    if (req.user.balance < charge) {
      return res.status(400).json({ success: false, message: 'Số dư không đủ' });
    }

    const order = await Order.create({ userId: req.user._id, serviceId, link, quantity: qty, charge });

    req.user.balance -= charge;
    await req.user.save();

    await Transaction.create({
      userId: req.user._id,
      type: 'order',
      amount: -charge,
      note: `Thanh toán đơn hàng ${order.orderId}`,
      status: 'completed',
    });

    res.status(201).json({ success: true, data: { order: { ...order.toObject(), service: service.toObject() } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
