const Group = require('./Group');
const Contact = require('./Contact');
const ContactGroup = require('./ContactGroup');

// Define associations
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
