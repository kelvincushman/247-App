# Database Schema - 247 Trades Platform

Complete PostgreSQL database schema using Sequelize ORM.

## Overview

The database consists of the following core tables:
- **users** - Customer and tradesperson accounts
- **jobs** - Job postings and requests
- **messages** - Real-time messaging between users
- **conversations** - Message conversation threads
- **notifications** - System notifications
- **reviews** - Job reviews and ratings
- **payments** - Payment transactions and escrow
- **job_locations** - GPS tracking for active jobs
- **job_images** - Job photo uploads
- **user_payment_methods** - Stripe payment methods
- **tradesperson_profiles** - Extended tradesperson information

## Database Models

### 1. User Model

File: `src/models/User.js`

```javascript
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('customer', 'tradesperson', 'admin'),
    allowNull: false,
    defaultValue: 'customer',
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripeConnectId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'For tradespeople receiving payments',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Firebase Cloud Messaging token for push notifications',
  },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
```

### 2. Tradesperson Profile Model

File: `src/models/TradespersonProfile.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TradespersonProfile = sequelize.define('TradespersonProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  category: {
    type: DataTypes.ENUM('plumber', 'electrician', 'carpenter', 'painter', 'general'),
    allowNull: false,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  certifications: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  serviceRadius: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    comment: 'Service radius in kilometers',
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
  },
  totalReviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalJobsCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  successRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: 'Percentage of successfully completed jobs',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  currentLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true,
  },
}, {
  tableName: 'tradesperson_profiles',
  timestamps: true,
});

module.exports = TradespersonProfile;
```

### 3. Job Model

File: `src/models/Job.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tradespersonId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('plumber', 'electrician', 'carpenter', 'painter', 'general'),
    allowNull: false,
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
    defaultValue: 'requested',
  },
  estimatedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  postcode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  urgency: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'emergency'),
    defaultValue: 'medium',
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  completionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'jobs',
  timestamps: true,
  indexes: [
    { fields: ['customerId'] },
    { fields: ['tradespersonId'] },
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['createdAt'] },
    {
      name: 'jobs_location_idx',
      fields: ['location'],
      using: 'GIST',
    },
  ],
});

module.exports = Job;
```

### 4. Job Images Model

File: `src/models/JobImage.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobImage = sequelize.define('JobImage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  caption: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'job_images',
  timestamps: true,
  indexes: [
    { fields: ['jobId'] },
  ],
});

module.exports = JobImage;
```

### 5. Job Location Model

File: `src/models/JobLocation.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobLocation = sequelize.define('JobLocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  accuracy: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'GPS accuracy in meters',
  },
}, {
  tableName: 'job_locations',
  timestamps: false,
  indexes: [
    { fields: ['jobId'] },
    { fields: ['timestamp'] },
    {
      name: 'job_locations_location_idx',
      fields: ['location'],
      using: 'GIST',
    },
  ],
});

module.exports = JobLocation;
```

### 6. Message Model

File: `src/models/Message.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'location', 'system'),
    defaultValue: 'text',
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true,
  },
  locationAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['senderId'] },
    { fields: ['receiverId'] },
    { fields: ['createdAt'] },
    { fields: ['isRead'] },
  ],
});

module.exports = Message;
```

### 7. Conversation Model

File: `src/models/Conversation.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tradespersonId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastMessageText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  unreadCountCustomer: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  unreadCountTradesperson: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'conversations',
  timestamps: true,
  indexes: [
    { fields: ['jobId'], unique: true },
    { fields: ['customerId'] },
    { fields: ['tradespersonId'] },
    { fields: ['lastMessageAt'] },
  ],
});

module.exports = Conversation;
```

### 8. Notification Model

File: `src/models/Notification.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.ENUM(
      'job_assigned',
      'job_accepted',
      'job_started',
      'job_completed',
      'job_cancelled',
      'new_message',
      'payment_received',
      'payment_released',
      'review_received',
      'system'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data like jobId, conversationId, etc.',
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sentViaEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  sentViaPush: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['isRead'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Notification;
```

### 9. Review Model

File: `src/models/Review.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'jobs',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  tradespersonId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'e.g., ["professional", "on-time", "quality-work"]',
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Review from actual completed job',
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Tradesperson response to review',
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'reviews',
  timestamps: true,
  indexes: [
    { fields: ['tradespersonId'] },
    { fields: ['customerId'] },
    { fields: ['jobId'], unique: true },
    { fields: ['rating'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Review;
```

### 10. Payment Model

File: `src/models/Payment.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id',
    },
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tradespersonId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  platformFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '15% platform fee',
  },
  tradespersonAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Amount after platform fee',
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'gbp',
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'authorized',
      'held',
      'released',
      'refunded',
      'failed',
      'disputed'
    ),
    defaultValue: 'pending',
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripeChargeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripeTransferId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentMethodId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'user_payment_methods',
      key: 'id',
    },
  },
  authorizedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  releasedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['jobId'] },
    { fields: ['customerId'] },
    { fields: ['tradespersonId'] },
    { fields: ['status'] },
    { fields: ['stripePaymentIntentId'] },
  ],
});

module.exports = Payment;
```

### 11. User Payment Method Model

File: `src/models/UserPaymentMethod.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPaymentMethod = sequelize.define('UserPaymentMethod', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  stripePaymentMethodId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'card, bank_account, etc.',
  },
  cardBrand: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cardLast4: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cardExpMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  cardExpYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'user_payment_methods',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['stripePaymentMethodId'] },
  ],
});

module.exports = UserPaymentMethod;
```

## Model Associations

File: `src/models/index.js`

```javascript
const { sequelize } = require('../config/database');

const User = require('./User');
const TradespersonProfile = require('./TradespersonProfile');
const Job = require('./Job');
const JobImage = require('./JobImage');
const JobLocation = require('./JobLocation');
const Message = require('./Message');
const Conversation = require('./Conversation');
const Notification = require('./Notification');
const Review = require('./Review');
const Payment = require('./Payment');
const UserPaymentMethod = require('./UserPaymentMethod');

// User associations
User.hasOne(TradespersonProfile, { foreignKey: 'userId', as: 'tradespersonProfile' });
TradespersonProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Job, { foreignKey: 'customerId', as: 'customerJobs' });
User.hasMany(Job, { foreignKey: 'tradespersonId', as: 'tradespersonJobs' });
Job.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Job.belongsTo(User, { foreignKey: 'tradespersonId', as: 'tradesperson' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserPaymentMethod, { foreignKey: 'userId', as: 'paymentMethods' });
UserPaymentMethod.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Job associations
Job.hasMany(JobImage, { foreignKey: 'jobId', as: 'images' });
JobImage.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

Job.hasMany(JobLocation, { foreignKey: 'jobId', as: 'locations' });
JobLocation.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

Job.hasOne(Conversation, { foreignKey: 'jobId', as: 'conversation' });
Conversation.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

Job.hasOne(Review, { foreignKey: 'jobId', as: 'review' });
Review.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

Job.hasOne(Payment, { foreignKey: 'jobId', as: 'payment' });
Payment.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

// Conversation associations
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

Conversation.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Conversation.belongsTo(User, { foreignKey: 'tradespersonId', as: 'tradesperson' });

// Message associations
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Review associations
Review.belongsTo(User, { foreignKey: 'tradespersonId', as: 'tradesperson' });
Review.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

// Payment associations
Payment.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Payment.belongsTo(User, { foreignKey: 'tradespersonId', as: 'tradesperson' });
Payment.belongsTo(UserPaymentMethod, { foreignKey: 'paymentMethodId', as: 'paymentMethod' });

module.exports = {
  sequelize,
  User,
  TradespersonProfile,
  Job,
  JobImage,
  JobLocation,
  Message,
  Conversation,
  Notification,
  Review,
  Payment,
  UserPaymentMethod,
};
```

## Database Indexes

Key indexes for performance:

```sql
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Job indexes
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_tradesperson_id ON jobs(tradesperson_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);

-- Message indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Conversation indexes
CREATE UNIQUE INDEX idx_conversations_job_id ON conversations(job_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_tradesperson_id ON conversations(tradesperson_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Payment indexes
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_tradesperson_id ON payments(tradesperson_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Review indexes
CREATE INDEX idx_reviews_tradesperson_id ON reviews(tradesperson_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE UNIQUE INDEX idx_reviews_job_id ON reviews(job_id);
```

## PostGIS Extension

For geospatial queries, enable PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Sample Queries

### Find nearby jobs (within 50km)
```sql
SELECT *
FROM jobs
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint(-0.127758, 51.507351)::geography,
  50000  -- 50km in meters
)
AND status = 'requested';
```

### Calculate distance
```sql
SELECT
  id,
  title,
  ST_Distance(
    location::geography,
    ST_MakePoint(-0.127758, 51.507351)::geography
  ) / 1000 AS distance_km
FROM jobs
ORDER BY distance_km;
```

### Get tradesperson average rating
```sql
SELECT
  tradesperson_id,
  AVG(rating) as average_rating,
  COUNT(*) as total_reviews
FROM reviews
WHERE tradesperson_id = 'uuid-here'
GROUP BY tradesperson_id;
```

## Next Steps

1. Create migration files for all tables
2. Implement seeder files for test data
3. Review API endpoint documentation for query patterns
4. Set up database backup strategy
