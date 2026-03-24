import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

// User: get all their tickets
router.get('/', protect, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: { tickets } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User: get single ticket
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
    res.json({ success: true, data: { ticket } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User: create or reply to ticket
router.post('/reply', protect, async (req, res) => {
  try {
    const { message, subject } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Tin nhắn không được trống' });

    const openTickets = await Ticket.find({ userId: req.user._id, status: 'open' });

    if (openTickets.length > 0) {
      // Add reply to existing open ticket
      const ticket = openTickets[0];
      ticket.messages.push({ sender: 'user', message });
      await ticket.save();
      res.json({ success: true, data: { ticket } });
    } else {
      // Create new ticket
      if (!subject) return res.status(400).json({ success: false, message: 'Tiêu đề không được trống khi tạo ticket mới' });
      const ticket = await Ticket.create({
        userId: req.user._id,
        subject,
        messages: [{ sender: 'user', message }],
      });
      res.status(201).json({ success: true, data: { ticket } });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: list all tickets
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('userId', 'username email').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: { tickets } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: get single ticket
router.get('/admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('userId', 'username email');
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
    res.json({ success: true, data: { ticket } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: reply to ticket
router.post('/admin/:id/reply', protect, adminOnly, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Tin nhắn không được trống' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });

    ticket.messages.push({ sender: 'admin', message });
    await ticket.save();
    res.json({ success: true, data: { ticket } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: close ticket
router.post('/admin/:id/close', protect, adminOnly, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
    ticket.status = 'closed';
    await ticket.save();
    res.json({ success: true, data: { ticket } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
