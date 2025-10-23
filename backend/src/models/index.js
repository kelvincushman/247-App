const { sequelize } = require('../config/database');
const User = require('./User');
const CustomerProfile = require('./CustomerProfile');
const TradespersonProfile = require('./TradespersonProfile');
const Job = require('./Job');
const Review = require('./Review');

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

module.exports = {
  sequelize,
  User,
  CustomerProfile,
  TradespersonProfile,
  Job,
  Review
};
