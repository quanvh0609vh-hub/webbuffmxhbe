import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  pricePer1k: { type: Number, required: true },
  minOrder: { type: Number, default: 10 },
  maxOrder: { type: Number, default: 10000 },
  averageTime: { type: String, default: '24 hours' },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export default mongoose.model('Service', serviceSchema);
