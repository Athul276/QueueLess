const Token = require('../models/Token');
const Service = require('../models/Service');
const Counter = require('../models/Counter');

// Helper to format token number, e.g. code "A" + 1 -> "A001"
const formatTokenNumber = (code, seq) => {
  const padded = String(seq).padStart(3, '0');
  return `${code}${padded}`;
};

// @desc    Generate a new digital token for a service
// @route   POST /api/tokens/generate
// @access  Private (Logged-in User)
exports.generateToken = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const userId = req.user.id;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid serviceId',
      });
    }

    const service = await Service.findById(serviceId);
    if (!service || service.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Selected service is not currently available',
      });
    }

    // Check if user already has an active WAITING or CALLED token for this service
    const existingActive = await Token.findOne({
      user: userId,
      service: serviceId,
      status: { $in: ['WAITING', 'CALLED'] },
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `You already have an active token (${existingActive.tokenNumber}) for ${service.serviceName}.`,
        existingToken: existingActive,
      });
    }

    // Atomic / highest sequence query for this service
    // Find the token with the highest sequenceNumber for this service
    const lastToken = await Token.findOne({ service: serviceId }).sort({ sequenceNumber: -1 });

    const nextSeq = lastToken && lastToken.sequenceNumber ? lastToken.sequenceNumber + 1 : 1;
    const tokenNumber = formatTokenNumber(service.code, nextSeq);

    // Calculate queue position: how many people are currently WAITING ahead of this new token
    const waitingAhead = await Token.countDocuments({
      service: serviceId,
      status: 'WAITING',
    });

    const avgMinutes = service.avgServiceTimeMinutes || 5;
    const estimatedWaitMinutes = waitingAhead * avgMinutes;

    const token = await Token.create({
      tokenNumber,
      sequenceNumber: nextSeq,
      user: userId,
      service: serviceId,
      status: 'WAITING',
      estimatedWaitMinutes,
    });

    const populated = await Token.findById(token._id)
      .populate('service', 'serviceName code avgServiceTimeMinutes')
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: {
        token: populated,
        queuePosition: waitingAhead + 1,
        waitingAhead,
        estimatedWaitMinutes,
      },
      message: `Token ${tokenNumber} successfully generated!`,
    });
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating token',
    });
  }
};

// @desc    Get user's tokens (active & history)
// @route   GET /api/tokens/my-tokens
// @access  Private
exports.getMyTokens = async (req, res) => {
  try {
    const userId = req.user.id;

    const activeTokens = await Token.find({
      user: userId,
      status: { $in: ['WAITING', 'CALLED'] },
    })
      .populate('service', 'serviceName code avgServiceTimeMinutes')
      .populate('counter', 'counterName')
      .sort({ createdAt: -1 });

    // Calculate live position and wait time for each active token
    const activeWithLiveStats = await Promise.all(
      activeTokens.map(async (tok) => {
        let position = 0;
        let waitingAhead = 0;
        let currentServing = null;

        if (tok.status === 'CALLED') {
          position = 0;
          waitingAhead = 0;
        } else {
          // Count tokens waiting for the same service created before this token
          waitingAhead = await Token.countDocuments({
            service: tok.service._id,
            status: 'WAITING',
            createdAt: { $lt: tok.createdAt },
          });
          position = waitingAhead + 1;
        }

        const servingToken = await Token.findOne({
          service: tok.service._id,
          status: 'CALLED',
        }).sort({ calledAt: -1 });

        if (servingToken) {
          currentServing = servingToken.tokenNumber;
        }

        const avgMinutes = tok.service.avgServiceTimeMinutes || 5;
        const liveEstimatedWait = tok.status === 'CALLED' ? 0 : waitingAhead * avgMinutes;

        return {
          ...tok.toObject(),
          position,
          waitingAhead,
          currentServing: currentServing || 'None yet',
          estimatedWaitMinutes: liveEstimatedWait,
        };
      })
    );

    const historyTokens = await Token.find({
      user: userId,
      status: { $in: ['COMPLETED', 'SKIPPED', 'CANCELLED'] },
    })
      .populate('service', 'serviceName code')
      .populate('counter', 'counterName')
      .sort({ updatedAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      active: activeWithLiveStats,
      history: historyTokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get live status for a specific token
// @route   GET /api/tokens/live-status/:id
// @access  Public / Private
exports.getTokenLiveStatus = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id)
      .populate('service', 'serviceName code avgServiceTimeMinutes')
      .populate('counter', 'counterName')
      .populate('user', 'name email');

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found',
      });
    }

    let position = 0;
    let waitingAhead = 0;

    if (token.status === 'WAITING') {
      waitingAhead = await Token.countDocuments({
        service: token.service._id,
        status: 'WAITING',
        createdAt: { $lt: token.createdAt },
      });
      position = waitingAhead + 1;
    }

    const currentServing = await Token.findOne({
      service: token.service._id,
      status: 'CALLED',
    })
      .populate('counter', 'counterName')
      .sort({ calledAt: -1 });

    const avgMinutes = token.service.avgServiceTimeMinutes || 5;
    const estimatedWaitMinutes = token.status === 'WAITING' ? waitingAhead * avgMinutes : 0;

    res.status(200).json({
      success: true,
      token,
      queuePosition: position,
      waitingAhead,
      estimatedWaitMinutes,
      currentServing: currentServing
        ? {
            tokenNumber: currentServing.tokenNumber,
            counter: currentServing.counter ? currentServing.counter.counterName : 'Counter',
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Admin: Call Next Token
// @route   POST /api/tokens/call-next
// @access  Private / Admin
exports.callNextToken = async (req, res) => {
  try {
    const { counterId, serviceId } = req.body;

    let counter = null;
    let targetServiceId = serviceId;

    if (counterId) {
      counter = await Counter.findById(counterId);
      if (!counter) {
        return res.status(404).json({
          success: false,
          message: 'Counter not found',
        });
      }
      targetServiceId = counter.service;
    }

    if (!targetServiceId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a counterId or serviceId to call next token',
      });
    }

    // 1. If counter currently has a CALLED token, automatically mark it as COMPLETED
    if (counter && counter.currentServingToken) {
      await Token.findByIdAndUpdate(counter.currentServingToken, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });
      counter.currentServingToken = null;
    }

    // 2. Find the earliest WAITING token for this service
    const nextToken = await Token.findOne({
      service: targetServiceId,
      status: 'WAITING',
    }).sort({ sequenceNumber: 1 });

    if (!nextToken) {
      if (counter) {
        counter.status = 'ACTIVE';
        counter.currentServingToken = null;
        await counter.save();
      }
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No more waiting tokens for this service!',
      });
    }

    // 3. Mark nextToken as CALLED
    nextToken.status = 'CALLED';
    nextToken.calledAt = new Date();
    if (counter) {
      nextToken.counter = counter._id;
      counter.currentServingToken = nextToken._id;
      counter.status = 'BUSY';
      await counter.save();
    }
    await nextToken.save();

    const populatedToken = await Token.findById(nextToken._id)
      .populate('service', 'serviceName code')
      .populate('counter', 'counterName')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: populatedToken,
      message: `Now Serving: Token ${nextToken.tokenNumber}!`,
    });
  } catch (error) {
    console.error('Call next error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Admin: Skip a token
// @route   POST /api/tokens/:id/skip
// @access  Private / Admin
exports.skipToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found',
      });
    }

    token.status = 'SKIPPED';
    await token.save();

    // Release counter if this token was on a counter
    await Counter.updateMany(
      { currentServingToken: token._id },
      { currentServingToken: null, status: 'ACTIVE' }
    );

    res.status(200).json({
      success: true,
      data: token,
      message: `Token ${token.tokenNumber} has been skipped.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Admin or User: Cancel a token
// @route   POST /api/tokens/:id/cancel
// @access  Private
exports.cancelToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found',
      });
    }

    // If not admin, verify ownership
    if (req.user.role !== 'admin' && token.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this token',
      });
    }

    token.status = 'CANCELLED';
    await token.save();

    // Release counter if this token was on a counter
    await Counter.updateMany(
      { currentServingToken: token._id },
      { currentServingToken: null, status: 'ACTIVE' }
    );

    res.status(200).json({
      success: true,
      data: token,
      message: `Token ${token.tokenNumber} has been cancelled.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Admin: Mark token as completed
// @route   POST /api/tokens/:id/complete
// @access  Private / Admin
exports.completeToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found',
      });
    }

    token.status = 'COMPLETED';
    token.completedAt = new Date();
    await token.save();

    await Counter.updateMany(
      { currentServingToken: token._id },
      { currentServingToken: null, status: 'ACTIVE' }
    );

    res.status(200).json({
      success: true,
      data: token,
      message: `Token ${token.tokenNumber} marked as completed!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Admin: Get all tokens with filters & monitoring statistics
// @route   GET /api/tokens/admin/monitoring
// @access  Private / Admin
exports.getAdminMonitoring = async (req, res) => {
  try {
    const { serviceId } = req.query;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const baseFilter = serviceId ? { service: serviceId } : {};

    // Counts
    const totalWaiting = await Token.countDocuments({
      ...baseFilter,
      status: 'WAITING',
    });

    const currentlyServing = await Token.countDocuments({
      ...baseFilter,
      status: 'CALLED',
    });

    const completedToday = await Token.countDocuments({
      ...baseFilter,
      status: 'COMPLETED',
      updatedAt: { $gte: startOfToday },
    });

    const skippedToday = await Token.countDocuments({
      ...baseFilter,
      status: 'SKIPPED',
      updatedAt: { $gte: startOfToday },
    });

    const cancelledToday = await Token.countDocuments({
      ...baseFilter,
      status: 'CANCELLED',
      updatedAt: { $gte: startOfToday },
    });

    // Active Queue list
    const activeQueue = await Token.find({
      ...baseFilter,
      status: { $in: ['CALLED', 'WAITING'] },
    })
      .populate('service', 'serviceName code')
      .populate('counter', 'counterName')
      .populate('user', 'name email')
      .sort({ status: 1, sequenceNumber: 1 });

    // Recent History
    const recentHistory = await Token.find({
      ...baseFilter,
      status: { $in: ['COMPLETED', 'SKIPPED', 'CANCELLED'] },
    })
      .populate('service', 'serviceName code')
      .populate('counter', 'counterName')
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      stats: {
        totalWaiting,
        currentlyServing,
        completedToday,
        skippedToday,
        cancelledToday,
      },
      activeQueue,
      recentHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get complete history (user or admin)
// @route   GET /api/tokens/history
// @access  Private
exports.getQueueHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    } else if (req.query.userId) {
      filter.user = req.query.userId;
    }

    if (req.query.serviceId) {
      filter.service = req.query.serviceId;
    }

    if (req.query.status) {
      filter.status = req.query.status.toUpperCase();
    }

    const history = await Token.find(filter)
      .populate('service', 'serviceName code')
      .populate('counter', 'counterName')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
