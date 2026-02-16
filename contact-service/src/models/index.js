const Group = require('./Group');
const Contact = require('./Contact');
const ContactGroup = require('./ContactGroup');

// Direct foreign key relationship (groupId in contacts table)
Group.hasMany(Contact, {
  foreignKey: 'groupId',
  as: 'directContacts',
  onDelete: 'CASCADE'
});

Contact.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group'
});

// Define associations (many-to-many through junction table)
Contact.belongsToMany(Group, {
  through: ContactGroup,
  foreignKey: 'contactId',
  otherKey: 'groupId',
  as: 'groups',
});

Group.belongsToMany(Contact, {
  through: ContactGroup,
  foreignKey: 'groupId',
  otherKey: 'contactId',
  as: 'contacts',
});

module.exports = {
  Group,
  Contact,
  ContactGroup,
};
