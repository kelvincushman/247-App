const { Availability, TimeSlot, Job, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * Get or create availability settings for tradesperson
 * @param {string} tradespersonId - Tradesperson user ID
 * @returns {Promise<Availability>} Availability settings
 */
const getOrCreateAvailability = async (tradespersonId) => {
  try {
    let availability = await Availability.findOne({
      where: { tradesperson_id: tradespersonId }
    });

    if (!availability) {
      // Create default availability (9am-5pm Monday-Friday)
      const defaultSchedule = [{ start: '09:00', end: '17:00' }];

      availability = await Availability.create({
        tradesperson_id: tradespersonId,
        is_available: true,
        monday_schedule: defaultSchedule,
        tuesday_schedule: defaultSchedule,
        wednesday_schedule: defaultSchedule,
        thursday_schedule: defaultSchedule,
        friday_schedule: defaultSchedule,
        saturday_schedule: null,
        sunday_schedule: null,
        timezone: 'UTC'
      });

      logger.info(`Created default availability for tradesperson ${tradespersonId}`);
    }

    return availability;
  } catch (error) {
    logger.error('Error getting/creating availability:', error);
    throw error;
  }
};

/**
 * Update availability settings
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {object} updates - Fields to update
 * @returns {Promise<Availability>} Updated availability
 */
const updateAvailability = async (tradespersonId, updates) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    await availability.update(updates);

    logger.info(`Updated availability for tradesperson ${tradespersonId}`);

    return availability;
  } catch (error) {
    logger.error('Error updating availability:', error);
    throw error;
  }
};

/**
 * Toggle availability status (online/offline)
 * @param {string} tradespersonId - Tradesperson user ID
 * @returns {Promise<Availability>} Updated availability
 */
const toggleAvailability = async (tradespersonId) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    await availability.toggleAvailability();

    logger.info(`Toggled availability for tradesperson ${tradespersonId}: ${availability.is_available}`);

    return availability;
  } catch (error) {
    logger.error('Error toggling availability:', error);
    throw error;
  }
};

/**
 * Set weekly schedule for a tradesperson
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {object} weeklySchedule - Schedule for each day
 * @returns {Promise<Availability>} Updated availability
 */
const setWeeklySchedule = async (tradespersonId, weeklySchedule) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    const updates = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
      if (weeklySchedule[day] !== undefined) {
        updates[`${day}_schedule`] = weeklySchedule[day];
      }
    });

    await availability.update(updates);

    logger.info(`Set weekly schedule for tradesperson ${tradespersonId}`);

    return availability;
  } catch (error) {
    logger.error('Error setting weekly schedule:', error);
    throw error;
  }
};

/**
 * Add exception date (holiday, day off, etc.)
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} reason - Reason for exception
 * @returns {Promise<Availability>} Updated availability
 */
const addExceptionDate = async (tradespersonId, date, reason) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    await availability.addExceptionDate(date, reason);

    logger.info(`Added exception date ${date} for tradesperson ${tradespersonId}`);

    return availability;
  } catch (error) {
    logger.error('Error adding exception date:', error);
    throw error;
  }
};

/**
 * Remove exception date
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Availability>} Updated availability
 */
const removeExceptionDate = async (tradespersonId, date) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    await availability.removeExceptionDate(date);

    logger.info(`Removed exception date ${date} for tradesperson ${tradespersonId}`);

    return availability;
  } catch (error) {
    logger.error('Error removing exception date:', error);
    throw error;
  }
};

/**
 * Generate available time slots for a date range
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of available time slots
 */
const generateTimeSlots = async (tradespersonId, startDate, endDate) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    if (!availability.is_available) {
      return []; // Tradesperson is offline
    }

    const slots = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if date is an exception
      if (availability.isExceptionDate(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Get day name
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[currentDate.getDay()];

      // Get schedule for this day
      const daySchedule = availability.getScheduleForDay(dayName);

      if (daySchedule && daySchedule.length > 0) {
        // Generate slots for this day
        for (const period of daySchedule) {
          const periodSlots = generateSlotsForPeriod(
            currentDate,
            period.start,
            period.end,
            availability.default_slot_duration_minutes || 60,
            availability.lunch_break
          );

          slots.push(...periodSlots);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check which slots are already booked
    const existingSlots = await TimeSlot.findAll({
      where: {
        tradesperson_id: tradespersonId,
        start_time: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.in]: ['booked', 'blocked']
        }
      }
    });

    // Filter out booked/blocked slots
    const availableSlots = slots.filter(slot => {
      return !existingSlots.some(existing =>
        slot.start_time >= existing.start_time &&
        slot.start_time < existing.end_time
      );
    });

    return availableSlots;
  } catch (error) {
    logger.error('Error generating time slots:', error);
    throw error;
  }
};

/**
 * Helper: Generate slots for a specific time period
 */
const generateSlotsForPeriod = (date, startTime, endTime, duration, lunchBreak) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const current = new Date(date);
  current.setHours(startHour, startMin, 0, 0);

  const periodEnd = new Date(date);
  periodEnd.setHours(endHour, endMin, 0, 0);

  while (current < periodEnd) {
    const slotEnd = new Date(current.getTime() + duration * 60000);

    // Check if slot overlaps with lunch break
    if (lunchBreak) {
      const [lunchStart, lunchEnd] = [lunchBreak.start, lunchBreak.end];
      const [lunchStartHour, lunchStartMin] = lunchStart.split(':').map(Number);
      const [lunchEndHour, lunchEndMin] = lunchEnd.split(':').map(Number);

      const lunchStartTime = new Date(date);
      lunchStartTime.setHours(lunchStartHour, lunchStartMin, 0, 0);

      const lunchEndTime = new Date(date);
      lunchEndTime.setHours(lunchEndHour, lunchEndMin, 0, 0);

      // Skip if slot overlaps with lunch
      if (current < lunchEndTime && slotEnd > lunchStartTime) {
        current.setTime(lunchEndTime.getTime());
        continue;
      }
    }

    if (slotEnd <= periodEnd) {
      slots.push({
        start_time: new Date(current),
        end_time: new Date(slotEnd)
      });
    }

    current.setTime(current.getTime() + duration * 60000);
  }

  return slots;
};

/**
 * Check if tradesperson is available at a specific time
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Promise<object>} Availability status and reason
 */
const checkAvailability = async (tradespersonId, startTime, endTime) => {
  try {
    const availability = await getOrCreateAvailability(tradespersonId);

    // Check if tradesperson is online
    if (!availability.is_available) {
      return {
        available: false,
        reason: 'Tradesperson is currently offline'
      };
    }

    // Check minimum advance booking
    const now = new Date();
    const hoursUntilStart = (new Date(startTime) - now) / (1000 * 60 * 60);

    if (hoursUntilStart < availability.min_advance_booking_hours) {
      return {
        available: false,
        reason: `Requires at least ${availability.min_advance_booking_hours} hours advance booking`
      };
    }

    // Check maximum advance booking
    const daysUntilStart = hoursUntilStart / 24;

    if (daysUntilStart > availability.max_advance_booking_days) {
      return {
        available: false,
        reason: `Cannot book more than ${availability.max_advance_booking_days} days in advance`
      };
    }

    // Check if date is an exception
    const dateStr = new Date(startTime).toISOString().split('T')[0];
    if (availability.isExceptionDate(dateStr)) {
      const exception = availability.exception_dates.find(ex => ex.date === dateStr);
      return {
        available: false,
        reason: exception?.reason || 'Date not available'
      };
    }

    // Check if time falls within working hours
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[new Date(startTime).getDay()];
    const daySchedule = availability.getScheduleForDay(dayName);

    if (!daySchedule || daySchedule.length === 0) {
      return {
        available: false,
        reason: 'Tradesperson does not work on this day'
      };
    }

    // Check if time slot conflicts with existing bookings
    const existingSlots = await TimeSlot.findAll({
      where: {
        tradesperson_id: tradespersonId,
        status: {
          [Op.in]: ['booked', 'blocked']
        },
        [Op.or]: [
          {
            start_time: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            end_time: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            [Op.and]: [
              { start_time: { [Op.lte]: startTime } },
              { end_time: { [Op.gte]: endTime } }
            ]
          }
        ]
      }
    });

    if (existingSlots.length > 0) {
      return {
        available: false,
        reason: 'Time slot already booked'
      };
    }

    return {
      available: true,
      reason: null
    };
  } catch (error) {
    logger.error('Error checking availability:', error);
    throw error;
  }
};

/**
 * Book a time slot
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {string} jobId - Job ID
 * @param {string} customerId - Customer ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Promise<TimeSlot>} Created time slot
 */
const bookTimeSlot = async (tradespersonId, jobId, customerId, startTime, endTime) => {
  try {
    // Check if available
    const availabilityCheck = await checkAvailability(tradespersonId, startTime, endTime);

    if (!availabilityCheck.available) {
      throw new Error(availabilityCheck.reason);
    }

    // Create time slot
    const timeSlot = await TimeSlot.create({
      tradesperson_id: tradespersonId,
      job_id: jobId,
      customer_id: customerId,
      start_time: startTime,
      end_time: endTime,
      status: 'booked',
      booked_at: new Date()
    });

    logger.info(`Booked time slot for job ${jobId} with tradesperson ${tradespersonId}`);

    return timeSlot;
  } catch (error) {
    logger.error('Error booking time slot:', error);
    throw error;
  }
};

/**
 * Cancel a booked time slot
 * @param {string} timeSlotId - Time slot ID
 * @returns {Promise<TimeSlot>} Updated time slot
 */
const cancelTimeSlot = async (timeSlotId) => {
  try {
    const timeSlot = await TimeSlot.findByPk(timeSlotId);

    if (!timeSlot) {
      throw new Error('Time slot not found');
    }

    await timeSlot.release();

    logger.info(`Cancelled time slot ${timeSlotId}`);

    return timeSlot;
  } catch (error) {
    logger.error('Error cancelling time slot:', error);
    throw error;
  }
};

/**
 * Get booked slots for a tradesperson
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Booked time slots
 */
const getBookedSlots = async (tradespersonId, startDate, endDate) => {
  try {
    const slots = await TimeSlot.findAll({
      where: {
        tradesperson_id: tradespersonId,
        start_time: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.in]: ['booked', 'completed']
        }
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'trade_category', 'status']
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ],
      order: [['start_time', 'ASC']]
    });

    return slots;
  } catch (error) {
    logger.error('Error getting booked slots:', error);
    throw error;
  }
};

/**
 * Block time slots (for personal time, breaks, etc.)
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @param {string} reason - Reason for blocking
 * @returns {Promise<TimeSlot>} Created time slot
 */
const blockTimeSlot = async (tradespersonId, startTime, endTime, reason) => {
  try {
    const timeSlot = await TimeSlot.create({
      tradesperson_id: tradespersonId,
      start_time: startTime,
      end_time: endTime,
      status: 'blocked',
      slot_type: 'exception',
      notes: reason
    });

    logger.info(`Blocked time slot for tradesperson ${tradespersonId}: ${reason}`);

    return timeSlot;
  } catch (error) {
    logger.error('Error blocking time slot:', error);
    throw error;
  }
};

module.exports = {
  getOrCreateAvailability,
  updateAvailability,
  toggleAvailability,
  setWeeklySchedule,
  addExceptionDate,
  removeExceptionDate,
  generateTimeSlots,
  checkAvailability,
  bookTimeSlot,
  cancelTimeSlot,
  getBookedSlots,
  blockTimeSlot
};
