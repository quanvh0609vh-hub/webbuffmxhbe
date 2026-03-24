import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import cloudinary from '../config/cloudinary.js';
import { generateApiKey } from '../utils/apiHelpers.js';

const router = Router();

router.get('/cloudinary/status', protect, async (_req, res) => {
  try {
    const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
    const hasSplitCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinaryUrl && !hasSplitCloudinaryConfig) {
      return res.status(500).json({ success: false, message: 'Thiếu cấu hình Cloudinary' });
    }

    const ping = await cloudinary.api.ping();

    return res.json({
      success: true,
      data: {
        status: ping?.status || 'ok',
        cloudName: cloudinary.config().cloud_name || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Cloudinary connection failed',
      error: err.message,
    });
  }
});

router.post('/avatar/upload', protect, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh' });
    }

    const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
    const hasSplitCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinaryUrl && !hasSplitCloudinaryConfig) {
      return res.status(500).json({ success: false, message: 'Thiếu cấu hình Cloudinary' });
    }

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'webbuffmxh/avatars',
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    res.json({ success: true, data: { avatarUrl: uploadResult.secure_url } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.put('/me', protect, async (req, res) => {
  try {
    const { username, email, avatarUrl } = req.body;
    const user = await User.findById(req.user._id);

    if (username) user.username = username;
    if (email) user.email = email;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/api-key', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: { apiKey: user.apiKey || '' } });
});

router.post('/api-key', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.apiKey = generateApiKey();
    await user.save();
    res.json({ success: true, data: { apiKey: user.apiKey } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/payments', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id, type: 'deposit' })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: { transactions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
