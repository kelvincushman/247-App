const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  tradesperson_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  trade_category: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g., Electrician, Plumber, Locksmith, Gas Engineer, Glazer'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Object with address, city, state, zip, lat, lng'
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Null for immediate requests'
  },
  urgency: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'emergency'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM(
      'requested',
      'assigned',
      'accepted',
      'in_progress',
      'completed',
      'cancelled',
      'disputed'
    ),
    defaultValue: 'requested'
  },
  estimated_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in minutes'
  },
  actual_start_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actual_end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  final_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'held', 'completed', 'refunded', 'failed'),
    defaultValue: 'pending'
  },
  payment_intent_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe payment intent ID'
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelled_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'jobs',
  timestamps: true
});

module.exports = Job;
