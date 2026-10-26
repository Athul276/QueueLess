const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: [true, 'Please add a service name'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Please add a single letter or prefix code (e.g. A, B, C)'],
      trim: true,
      uppercase: true,
      maxlength: 3,
    },
    description: {
      type: String,
      default: '',
    },
    avgServiceTimeMinutes: {
      type: Number,
      default: 5,
      min: 1,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    accessCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    requireAccessCode: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Service', serviceSchema);
