const { sequelize } = require('../config/database');
const User = require('./User');
const CustomerProfile = require('./CustomerProfile');
const TradespersonProfile = require('./TradespersonProfile');
const Job = require('./Job');
const Review = require('./Review');
const Message = require('./Message');
const Notification = require('./Notification');
const Availability = require('./Availability');
const TimeSlot = require('./TimeSlot');
const Location = require('./Location');

// Define associations
User.hasOne(CustomerProfile, { foreignKey: 'user_id', as: 'customerProfile' });
CustomerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(TradespersonProfile, { foreignKey: 'user_id', as: 'tradespersonProfile' });
TradespersonProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Job associations
User.hasMany(Job, { foreignKey: 'customer_id', as: 'jobsAsCustomer' });
Job.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(Job, { foreignKey: 'tradesperson_id', as: 'jobsAsTradesperson' });
Job.belongsTo(User, { foreignKey: 'tradesperson_id', as: 'tradesperson' });

// Review associations
User.hasMany(Review, { foreignKey: 'reviewer_id', as: 'reviewsGiven' });
Review.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });

User.hasMany(Review, { foreignKey: 'reviewee_id', as: 'reviewsReceived' });
Review.belongsTo(User, { foreignKey: 'reviewee_id', as: 'reviewee' });

Job.hasMany(Review, { foreignKey: 'job_id', as: 'reviews' });
Review.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

// Message associations
User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

User.hasMany(Message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

Job.hasMany(Message, { foreignKey: 'job_id', as: 'messages' });
Message.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Availability associations
User.hasOne(Availability, { foreignKey: 'tradesperson_id', as: 'availability' });
Availability.belongsTo(User, { foreignKey: 'tradesperson_id', as: 'tradesperson' });

// TimeSlot associations
User.hasMany(TimeSlot, { foreignKey: 'tradesperson_id', as: 'timeSlots' });
TimeSlot.belongsTo(User, { foreignKey: 'tradesperson_id', as: 'tradesperson' });

User.hasMany(TimeSlot, { foreignKey: 'customer_id', as: 'bookedSlots' });
TimeSlot.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

Job.hasOne(TimeSlot, { foreignKey: 'job_id', as: 'timeSlot' });
TimeSlot.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

// Location associations
User.hasMany(Location, { foreignKey: 'tradesperson_id', as: 'locations' });
Location.belongsTo(User, { foreignKey: 'tradesperson_id', as: 'tradesperson' });

Job.hasMany(Location, { foreignKey: 'job_id', as: 'locationHistory' });
Location.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

module.exports = {
  sequelize,
  User,
  CustomerProfile,
  TradespersonProfile,
  Job,
  Review,
  Message,
  Notification,
  Availability,
  TimeSlot,
  Location
};
