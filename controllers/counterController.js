const Counter = require('../models/Counter');
const Service = require('../models/Service');

// @desc    Get all counters
// @route   GET /api/counters
// @access  Public / Private
exports.getCounters = async (req, res) => {
  try {
    const counters = await Counter.find()
      .populate('service', 'serviceName code avgServiceTimeMinutes status')
      .populate('currentServingToken', 'tokenNumber status calledAt user')
      .sort({ counterName: 1 });

    res.status(200).json({
      success: true,
      count: counters.length,
      data: counters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new counter
// @route   POST /api/counters
// @access  Private / Admin
exports.createCounter = async (req, res) => {
  try {
    const { counterName, service, status } = req.body;

    if (!counterName || !service) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both counterName and service ID',
      });
    }

    const serviceExists = await Service.findById(service);
    if (!serviceExists) {
      return res.status(404).json({
        success: false,
        message: 'Selected service does not exist',
      });
    }

    const existingCounter = await Counter.findOne({ counterName: counterName.trim() });
    if (existingCounter) {
      return res.status(400).json({
        success: false,
        message: 'A counter with this name already exists',
      });
    }

    const counter = await Counter.create({
      counterName: counterName.trim(),
      service,
      status: status || 'ACTIVE',
    });

    const populated = await counter.populate('service', 'serviceName code');

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Counter created successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update counter
// @route   PUT /api/counters/:id
// @access  Private / Admin
exports.updateCounter = async (req, res) => {
  try {
    const { counterName, service, status } = req.body;

    let counter = await Counter.findById(req.params.id);
    if (!counter) {
      return res.status(404).json({
        success: false,
        message: 'Counter not found',
      });
    }

    if (counterName) counter.counterName = counterName.trim();
    if (service) {
      const serviceExists = await Service.findById(service);
      if (!serviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Selected service does not exist',
        });
      }
      counter.service = service;
    }
    if (status) counter.status = status;

    await counter.save();
    const updated = await counter.populate('service', 'serviceName code');

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Counter updated successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete counter
// @route   DELETE /api/counters/:id
// @access  Private / Admin
exports.deleteCounter = async (req, res) => {
  try {
    const counter = await Counter.findById(req.params.id);
    if (!counter) {
      return res.status(404).json({
        success: false,
        message: 'Counter not found',
      });
    }

    await Counter.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Counter deleted successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
