import { Router } from 'express';
import Service from '../models/Service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ status: 'active' }).sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, data: { services } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
