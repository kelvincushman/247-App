const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerProfile = sequelize.define('CustomerProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  addresses: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of saved addresses with label, street, city, state, zip, coordinates'
  },
  default_address_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  payment_methods: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Stripe payment method IDs and metadata'
  },
  default_payment_method: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe payment method ID'
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  total_jobs_requested: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notification_preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: true,
      push: true,
      sms: false,
      job_updates: true,
      messages: true,
      promotions: false
    }
  }
}, {
  tableName: 'customer_profiles',
  timestamps: true
});

module.exports = CustomerProfile;
