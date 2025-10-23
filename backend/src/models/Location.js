const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    validate: {
      min: -180,
      max: 180
    }
  },
  accuracy: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'GPS accuracy in meters'
  },
  heading: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 360
    },
    comment: 'Direction in degrees (0-360)'
  },
  speed: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    comment: 'Speed in meters per second'
  },
  altitude: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Altitude in meters'
  },
  distance_to_destination: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Distance to job location in kilometers'
  },
  estimated_arrival_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Calculated ETA based on current location and speed'
  },
  status: {
    type: DataTypes.ENUM('en_route', 'arrived', 'on_site', 'departed'),
    defaultValue: 'en_route'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Time when this location was recorded'
  }
}, {
  tableName: 'locations',
  timestamps: true,
  indexes: [
    {
      fields: ['job_id', 'timestamp']
    },
    {
      fields: ['tradesperson_id', 'timestamp']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Location;
