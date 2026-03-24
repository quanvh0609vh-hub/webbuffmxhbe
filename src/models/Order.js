import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  orderId: { type: String, unique: true },
  link: { type: String, required: true },
  quantity: { type: Number, required: true },
  charge: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Cancelled', 'Partial'], default: 'Pending' },
}, { timestamps: true });

orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `WBM-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
