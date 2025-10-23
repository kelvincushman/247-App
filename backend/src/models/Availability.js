const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Availability = sequelize.define('Availability', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tradesperson_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Quick toggle for online/offline status'
  },
  // Weekly recurring schedule
  monday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Array of time slots: [{start: "09:00", end: "17:00"}]'
  },
  tuesday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  wednesday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  thursday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  friday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  saturday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  sunday_schedule: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  // Exception dates (holidays, personal days, etc.)
  exception_dates: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of dates to block: [{date: "2024-12-25", reason: "Christmas"}]'
  },
  // Service areas
  service_areas: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of service areas: [{city: "London", radius: 10}] or postal codes'
  },
  // Advance booking settings
  min_advance_booking_hours: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    comment: 'Minimum hours in advance for booking'
  },
  max_advance_booking_days: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    comment: 'Maximum days in advance for booking'
  },
  // Slot duration
  default_slot_duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    comment: 'Default duration for time slots in minutes'
  },
  // Buffer between jobs
  buffer_time_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    comment: 'Buffer time between jobs in minutes'
  },
  // Break times
  lunch_break: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Lunch break time: {start: "12:00", end: "13:00"}'
  },
  // Auto-scheduling
  auto_accept_jobs: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Automatically accept jobs that fit schedule'
  },
  // Timezone
  timezone: {
    type: DataTypes.STRING,
    defaultValue: 'UTC',
    comment: 'Timezone for availability (e.g., Europe/London)'
  }
}, {
  tableName: 'availabilities',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tradesperson_id']
    },
    {
      fields: ['is_available']
    }
  ]
});

// Instance methods

/**
 * Toggle availability status
 */
Availability.prototype.toggleAvailability = function() {
  this.is_available = !this.is_available;
  return this.save();
};

/**
 * Set availability status
 */
Availability.prototype.setAvailability = function(status) {
  this.is_available = status;
  return this.save();
};

/**
 * Get schedule for a specific day
 */
Availability.prototype.getScheduleForDay = function(dayName) {
  const fieldName = `${dayName.toLowerCase()}_schedule`;
  return this[fieldName] || null;
};

/**
 * Set schedule for a specific day
 */
Availability.prototype.setScheduleForDay = function(dayName, schedule) {
  const fieldName = `${dayName.toLowerCase()}_schedule`;
  this[fieldName] = schedule;
  return this.save();
};

/**
 * Add exception date
 */
Availability.prototype.addExceptionDate = function(date, reason) {
  const exceptions = this.exception_dates || [];
  exceptions.push({ date, reason });
  this.exception_dates = exceptions;
  return this.save();
};

/**
 * Remove exception date
 */
Availability.prototype.removeExceptionDate = function(date) {
  this.exception_dates = (this.exception_dates || []).filter(ex => ex.date !== date);
  return this.save();
};

/**
 * Check if date is an exception
 */
Availability.prototype.isExceptionDate = function(date) {
  return (this.exception_dates || []).some(ex => ex.date === date);
};

module.exports = Availability;
