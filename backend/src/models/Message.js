const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
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
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  receiver_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true // Can be null if only sending an image
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'system'),
    defaultValue: 'text',
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true // Only set for image messages
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true // Set when receiver reads the message
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true // Set when message is delivered to receiver
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: true // Additional data like file size, dimensions, etc.
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['job_id', 'created_at']
    },
    {
      fields: ['sender_id']
    },
    {
      fields: ['receiver_id']
    },
    {
      fields: ['read_at']
    }
  ]
});

// Instance methods
Message.prototype.markAsDelivered = function() {
  this.delivered_at = new Date();
  return this.save();
};

Message.prototype.markAsRead = function() {
  if (!this.read_at) {
    this.read_at = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = Message;
