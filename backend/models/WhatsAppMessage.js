import mongoose from 'mongoose';

const whatsappMessageSchema = mongoose.Schema(
  {
    customerPhone: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true, // Meta's unique message ID
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'interactive', 'document', 'image', 'audio', 'video', 'button_reply', 'other'],
      default: 'text',
    },
    content: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String, // For outbound PDFs/images
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed', 'received'],
      default: 'received',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsappMessageSchema);

export default WhatsAppMessage;
