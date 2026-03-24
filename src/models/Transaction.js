import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'order', 'refund', 'withdraw', 'bonus'], required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'stripe' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  transactionId: { type: String },
  note: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
