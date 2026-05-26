import mongoose from 'mongoose';

const scriptSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    greeting: {
      type: String,
      required: true,
    },
    productIntro: {
      type: String,
      required: true,
    },
    salesPitch: {
      type: String,
      required: true,
    },
    commonQuestions: {
      type: String,
    },
    closingStatement: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Script = mongoose.model('Script', scriptSchema);

export default Script;
