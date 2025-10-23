const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('customer', 'tradesperson', 'admin'),
    allowNull: false,
    defaultValue: 'customer'
  },
  profile_image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  firebase_uid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  fcm_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Firebase Cloud Messaging token for push notifications'
  },
  notification_preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      job_updates: true,
      payment_updates: true,
      messages: true,
      reviews: true,
      marketing: false,
      push_enabled: true,
      email_enabled: true
    },
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    }
  }
});

// Instance method to check password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Don't return password in JSON
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password_hash;
  return values;
};

module.exports = User;
