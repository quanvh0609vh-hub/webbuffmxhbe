import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const router = Router();

router.get('/transactions', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: { transactions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/balance', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: { balance: user.balance } });
});

router.post('/deposit/sepay', protect, async (req, res) => {
  try {
    const { amountVND } = req.body;
    if (!amountVND || amountVND < 10000) {
      return res.status(400).json({ success: false, message: 'Số tiền tối thiểu là 10,000 VND' });
    }

    const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || '';
    const paymentCode = `WBM${Date.now()}`;
    const bankCode = (process.env.SEPAY_BANK_SHORT || process.env.SEPAY_BANK_NAME || '').trim();
    const bankName = process.env.SEPAY_BANK_NAME || bankCode || 'Ngân hàng';
    const accountName = process.env.SEPAY_BANK_FULLNAME || '';

    if (!accountNumber || !bankCode) {
      return res.status(500).json({ success: false, message: 'Thiếu cấu hình SEPAY_ACCOUNT_NUMBER hoặc SEPAY_BANK_SHORT' });
    }

    const qrTemplate = process.env.SEPAY_QR_TEMPLATE || 'qr_only';
    const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-${encodeURIComponent(qrTemplate)}.png?amount=${amountVND}&addInfo=${encodeURIComponent(paymentCode)}&accountName=${encodeURIComponent(accountName)}`;
    const qrDownloadUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-${encodeURIComponent(qrTemplate)}.png?amount=${amountVND}&addInfo=${encodeURIComponent(paymentCode)}&accountName=${encodeURIComponent(accountName)}&download=true`;

    await Transaction.create({
      userId: req.user._id,
      type: 'deposit',
      amount: amountVND,
      paymentMethod: 'sepay',
      status: 'pending',
      transactionId: paymentCode,
      note: `Nạp tiền qua SePay - ${amountVND} VND`,
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    res.json({ success: true, data: { qrUrl, qrDownloadUrl, amountVND, paymentCode, bankName, bankCode, bankAccount: accountNumber, expiresAt: expiresAt.toISOString() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/deposit/check/:paymentCode', protect, async (req, res) => {
  try {
    const { paymentCode } = req.params;
    const tx = await Transaction.findOne({ userId: req.user._id, transactionId: paymentCode });
    if (!tx) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    res.json({ success: true, data: { status: tx.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
