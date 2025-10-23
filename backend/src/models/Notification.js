const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM(
      'job_requested',
      'job_accepted',
      'job_declined',
      'job_started',
      'job_completed',
      'job_cancelled',
      'payment_held',
      'payment_captured',
      'payment_failed',
      'payment_refunded',
      'new_message',
      'review_received',
      'verification_approved',
      'verification_rejected',
      'payout_completed',
      'payout_failed',
      'system'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: true // Additional data like job_id, payment_id, etc.
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true // Set when user reads the notification
  },
  action_url: {
    type: DataTypes.STRING,
    allowNull: true // Deep link URL for mobile app
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  },
  push_sent_at: {
    type: DataTypes.DATE,
    allowNull: true // Set when push notification is sent
  },
  push_status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'not_required'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'read_at', 'created_at']
    },
    {
      fields: ['type']
    },
    {
      fields: ['push_status']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Notification.prototype.markAsRead = function() {
  if (!this.read_at) {
    this.read_at = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

Notification.prototype.markPushSent = function() {
  this.push_sent_at = new Date();
  this.push_status = 'sent';
  return this.save();
};

Notification.prototype.markPushFailed = function() {
  this.push_status = 'failed';
  return this.save();
};

module.exports = Notification;
