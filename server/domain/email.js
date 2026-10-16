import Joi from 'joi';

/** Case-fold an address so uniqueness and lookups ignore letter case (spec § 4). */
export const foldEmail = (email) => email.trim().toLowerCase();

export const emailSchema = Joi.string().trim().lowercase().email().max(254);

/** Mask an address for the "different email" hint of UC11 4a: m•••@gmail.com. */
export const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
};
