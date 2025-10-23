const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TradespersonProfile = sequelize.define('TradespersonProfile', {
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
  business_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  trade_specializations: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'e.g., ["Electrician", "HVAC", "Plumber"]'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  service_areas: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Geographic areas served (zip codes or city names)'
  },
  certifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of certification objects with name, issuer, expiry'
  },
  licenses: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of license objects with number, state, expiry'
  },
  insurance_documents: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Insurance policy documents'
  },
  portfolio_images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
    defaultValue: 'pending'
  },
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Quick availability toggle'
  },
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_jobs_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  stripe_account_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Connect account ID for payouts'
  }
}, {
  tableName: 'tradesperson_profiles',
  timestamps: true
});

module.exports = TradespersonProfile;
