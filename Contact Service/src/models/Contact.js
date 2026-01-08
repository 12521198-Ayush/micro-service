const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'first_name',
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'last_name',
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  countryCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '+1',
    field: 'country_code',
    validate: {
      notEmpty: true,
    },
  },
  company: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'job_title',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_favorite',
  },
}, {
  tableName: 'contacts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['email'],
    },
    {
      fields: ['user_id', 'email'],
    },
    {
      unique: true,
      fields: ['user_id', 'phone', 'country_code'],
      name: 'unique_user_phone_country'
    },
  ],
});

module.exports = Contact;
