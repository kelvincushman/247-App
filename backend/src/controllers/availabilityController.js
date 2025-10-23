const availabilityService = require('../services/availabilityService');
const logger = require('../config/logger');

/**
 * @desc    Get availability settings for current tradesperson
 * @route   GET /api/v1/availability
 * @access  Private (Tradesperson)
 */
const getAvailability = async (req, res) => {
  try {
    const availability = await availabilityService.getOrCreateAvailability(req.user.id);

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    logger.error('Error in getAvailability controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Update availability settings
 * @route   PUT /api/v1/availability
 * @access  Private (Tradesperson)
 */
const updateAvailability = async (req, res) => {
  try {
    const availability = await availabilityService.updateAvailability(req.user.id, req.body);

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    logger.error('Error in updateAvailability controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Toggle availability status (online/offline)
 * @route   PUT /api/v1/availability/toggle
 * @access  Private (Tradesperson)
 */
const toggleAvailability = async (req, res) => {
  try {
    const availability = await availabilityService.toggleAvailability(req.user.id);

    res.status(200).json({
      success: true,
      message: `Availability ${availability.is_available ? 'enabled' : 'disabled'}`,
      data: availability
    });
  } catch (error) {
    logger.error('Error in toggleAvailability controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Set weekly schedule
 * @route   PUT /api/v1/availability/schedule
 * @access  Private (Tradesperson)
 */
const setWeeklySchedule = async (req, res) => {
  try {
    const availability = await availabilityService.setWeeklySchedule(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Weekly schedule updated',
      data: availability
    });
  } catch (error) {
    logger.error('Error in setWeeklySchedule controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Add exception date (holiday, day off)
 * @route   POST /api/v1/availability/exceptions
 * @access  Private (Tradesperson)
 */
const addExceptionDate = async (req, res) => {
  try {
    const { date, reason } = req.body;

    const availability = await availabilityService.addExceptionDate(req.user.id, date, reason);

    res.status(200).json({
      success: true,
      message: 'Exception date added',
      data: availability
    });
  } catch (error) {
    logger.error('Error in addExceptionDate controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Remove exception date
 * @route   DELETE /api/v1/availability/exceptions/:date
 * @access  Private (Tradesperson)
 */
const removeExceptionDate = async (req, res) => {
  try {
    const { date } = req.params;

    const availability = await availabilityService.removeExceptionDate(req.user.id, date);

    res.status(200).json({
      success: true,
      message: 'Exception date removed',
      data: availability
    });
  } catch (error) {
    logger.error('Error in removeExceptionDate controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get available time slots
 * @route   GET /api/v1/availability/slots/:tradespersonId
 * @access  Public
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { tradespersonId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const slots = await availabilityService.generateTimeSlots(
      tradespersonId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    logger.error('Error in getAvailableSlots controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Check availability for specific time
 * @route   POST /api/v1/availability/check
 * @access  Public
 */
const checkAvailability = async (req, res) => {
  try {
    const { tradespersonId, startTime, endTime } = req.body;

    const result = await availabilityService.checkAvailability(
      tradespersonId,
      new Date(startTime),
      new Date(endTime)
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in checkAvailability controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Book a time slot
 * @route   POST /api/v1/availability/book
 * @access  Private (Customer)
 */
const bookSlot = async (req, res) => {
  try {
    const { tradespersonId, jobId, startTime, endTime } = req.body;

    const timeSlot = await availabilityService.bookTimeSlot(
      tradespersonId,
      jobId,
      req.user.id,
      new Date(startTime),
      new Date(endTime)
    );

    res.status(201).json({
      success: true,
      message: 'Time slot booked successfully',
      data: timeSlot
    });
  } catch (error) {
    logger.error('Error in bookSlot controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get booked slots for tradesperson
 * @route   GET /api/v1/availability/booked
 * @access  Private (Tradesperson)
 */
const getBookedSlots = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const slots = await availabilityService.getBookedSlots(
      req.user.id,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    logger.error('Error in getBookedSlots controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Block time slot
 * @route   POST /api/v1/availability/block
 * @access  Private (Tradesperson)
 */
const blockSlot = async (req, res) => {
  try {
    const { startTime, endTime, reason } = req.body;

    const timeSlot = await availabilityService.blockTimeSlot(
      req.user.id,
      new Date(startTime),
      new Date(endTime),
      reason
    );

    res.status(201).json({
      success: true,
      message: 'Time slot blocked',
      data: timeSlot
    });
  } catch (error) {
    logger.error('Error in blockSlot controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAvailability,
  updateAvailability,
  toggleAvailability,
  setWeeklySchedule,
  addExceptionDate,
  removeExceptionDate,
  getAvailableSlots,
  checkAvailability,
  bookSlot,
  getBookedSlots,
  blockSlot
};
