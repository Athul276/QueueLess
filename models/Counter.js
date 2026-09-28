const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    counterName: {
      type: String,
      required: [true, 'Please add a counter name'],
      trim: true,
      unique: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Please assign a service to this counter'],
    },
    currentServingToken: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'BUSY', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Counter', counterSchema);
