const Service = require('../models/Service');
const Token = require('../models/Token');
const Counter = require('../models/Counter');

// @desc    Get all services
// @route   GET /api/services
// @access  Public / Private
exports.getServices = async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { status: 'ACTIVE' };
    const services = await Service.find(filter).sort({ createdAt: 1 });

    // Attach real-time queue count for each service
    const servicesWithStats = await Promise.all(
      services.map(async (svc) => {
        const waitingCount = await Token.countDocuments({
          service: svc._id,
          status: 'WAITING',
        });
        const currentServing = await Token.findOne({
          service: svc._id,
          status: 'CALLED',
        }).sort({ calledAt: -1 });

        return {
          ...svc.toObject(),
          waitingCount,
          currentServingToken: currentServing ? currentServing.tokenNumber : 'None',
        };
      })
    );

    res.status(200).json({
      success: true,
      count: servicesWithStats.length,
      data: servicesWithStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public / Private
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new service
// @route   POST /api/services
// @access  Private / Admin
exports.createService = async (req, res) => {
  try {
    const { serviceName, code, description, avgServiceTimeMinutes, status } = req.body;

    if (!serviceName || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both serviceName and code prefix (e.g. A, B, C)',
      });
    }

    const existing = await Service.findOne({
      $or: [{ serviceName: serviceName.trim() }, { code: code.toUpperCase().trim() }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name or code already exists.',
      });
    }

    const service = await Service.create({
      serviceName: serviceName.trim(),
      code: code.toUpperCase().trim(),
      description: description || '',
      avgServiceTimeMinutes: Number(avgServiceTimeMinutes) || 5,
      status: status || 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      data: service,
      message: 'Service created successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private / Admin
exports.updateService = async (req, res) => {
  try {
    const { serviceName, code, description, avgServiceTimeMinutes, status } = req.body;

    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    if (serviceName) service.serviceName = serviceName.trim();
    if (code) service.code = code.toUpperCase().trim();
    if (description !== undefined) service.description = description;
    if (avgServiceTimeMinutes) service.avgServiceTimeMinutes = Number(avgServiceTimeMinutes);
    if (status) service.status = status;

    await service.save();

    res.status(200).json({
      success: true,
      data: service,
      message: 'Service updated successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private / Admin
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if there are active tokens for this service
    const activeTokens = await Token.countDocuments({
      service: service._id,
      status: { $in: ['WAITING', 'CALLED'] },
    });

    if (activeTokens > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete service with ${activeTokens} active tokens in queue. Please complete or cancel them first, or set status to INACTIVE.`,
      });
    }

    await Service.findByIdAndDelete(req.params.id);
    // Also remove assigned counters or unassign them
    await Counter.updateMany({ service: service._id }, { status: 'INACTIVE' });

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
