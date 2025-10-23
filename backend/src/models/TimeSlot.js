const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimeSlot = sequelize.define('TimeSlot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tradesperson_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'jobs',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Job associated with this slot (if booked)'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Start time of the slot'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'End time of the slot'
  },
  status: {
    type: DataTypes.ENUM('available', 'booked', 'blocked', 'completed'),
    defaultValue: 'available',
    allowNull: false
  },
  slot_type: {
    type: DataTypes.ENUM('regular', 'exception', 'break', 'buffer'),
    defaultValue: 'regular',
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes about this slot (e.g., reason for blocking)'
  },
  // Booking details
  booked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the slot was booked'
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Customer who booked this slot'
  }
}, {
  tableName: 'time_slots',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tradesperson_id', 'start_time', 'end_time']
    },
    {
      fields: ['status']
    },
    {
      fields: ['job_id']
    },
    {
      fields: ['start_time']
    },
    {
      // Prevent double-booking
      unique: true,
      fields: ['tradesperson_id', 'start_time'],
      name: 'unique_tradesperson_start_time'
    }
  ]
});

// Instance methods

/**
 * Book this time slot
 */
TimeSlot.prototype.book = function(jobId, customerId) {
  if (this.status !== 'available') {
    throw new Error('Time slot is not available');
  }

  this.status = 'booked';
  this.job_id = jobId;
  this.customer_id = customerId;
  this.booked_at = new Date();
  return this.save();
};

/**
 * Release this time slot (make it available again)
 */
TimeSlot.prototype.release = function() {
  this.status = 'available';
  this.job_id = null;
  this.customer_id = null;
  this.booked_at = null;
  return this.save();
};

/**
 * Block this time slot
 */
TimeSlot.prototype.block = function(reason) {
  this.status = 'blocked';
  this.notes = reason;
  return this.save();
};

/**
 * Mark as completed
 */
TimeSlot.prototype.complete = function() {
  this.status = 'completed';
  return this.save();
};

/**
 * Check if slot overlaps with given time range
 */
TimeSlot.prototype.overlaps = function(startTime, endTime) {
  const slotStart = new Date(this.start_time);
  const slotEnd = new Date(this.end_time);
  const rangeStart = new Date(startTime);
  const rangeEnd = new Date(endTime);

  return slotStart < rangeEnd && slotEnd > rangeStart;
};

module.exports = TimeSlot;
