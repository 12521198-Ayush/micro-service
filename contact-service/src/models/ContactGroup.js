const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContactGroup = sequelize.define('ContactGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id',
    },
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'group_id',
    references: {
      model: 'groups',
      key: 'id',
    },
  },
}, {
  tableName: 'contact_groups',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['contact_id', 'group_id'],
    },
    {
      fields: ['contact_id'],
    },
    {
      fields: ['group_id'],
    },
  ],
});

module.exports = ContactGroup;
