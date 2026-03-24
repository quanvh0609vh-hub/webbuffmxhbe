import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  messages: [{
    sender: { type: String, enum: ['user', 'admin'] },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
