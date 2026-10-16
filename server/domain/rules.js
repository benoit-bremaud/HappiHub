// Domain guards evaluated inside the write transaction, on locked rows (spec § 4).
export const MAX_ASSOCIATIONS_CREATED = 5;
export const INVITATIONS_PER_DAY = 10;

export const canCreateAssociation = (associationsCreated) => associationsCreated < MAX_ASSOCIATIONS_CREATED;
/** Last-member rule (UC12 1a): a membership may end only if another member remains. */
export const canLoseMember = (memberCount) => memberCount > 1;
export const canInvite = (sentToday) => sentToday < INVITATIONS_PER_DAY;
/** UC6 2c: the last super administrator cannot delete their account. */
export const canDeleteAccount = (role, otherSuperAdmins) => role !== 'SUPER_ADMIN' || otherSuperAdmins > 0;
