import Joi from 'joi';
import { emailSchema } from '../domain/email.js';
import { associationView, closeAssociation, endMembership, updateProfile } from '../services/associations.js';
import {
  acceptInvitation, createInvitation, listInvitations, lookupInvitation, resendInvitation, revokeInvitation,
} from '../services/invitations.js';
import { handle, validate } from './handle.js';

const uuid = Joi.string().guid({ version: ['uuidv4'] });
const idParam = (req, name) => validate(Joi.object({ id: uuid.required() }), { id: req.params[name] }).id;

export const getAssociation = handle(async (req, res) =>
  res.json(await associationView(req.app.locals.ctx.db, req.association)));

const optionalText = (max) => Joi.string().trim().max(max).allow('', null).empty('').default(null);
const profileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  city: optionalText(100),
  presentation: optionalText(2000),
  websiteUrl: Joi.string().trim().uri({ scheme: ['https', 'http'] }).max(300).allow('', null).empty('').default(null),
  contactEmail: emailSchema.allow('', null).empty('').default(null),
}).min(1);
/** UC7: only the fields sent change; the slug never changes. */
export const updateAssociation = handle(async (req, res) => {
  const value = validate(profileSchema, req.body);
  const changes = Object.fromEntries(Object.keys(req.body).map((key) => [key, value[key]]));
  await updateProfile(req.app.locals.ctx, req.account.id, req.association, changes);
  return res.status(204).end();
});

export const closeAssociationHandler = handle(async (req, res) => {
  validate(Joi.object({ confirm: Joi.valid(true).required() }), req.body);
  await closeAssociation(req.app.locals.ctx, req.account.id, req.association);
  return res.status(204).end();
});

export const removeMember = handle(async (req, res) => {
  await endMembership(req.app.locals.ctx, req.account, req.association, idParam(req, 'accountId'));
  return res.status(204).end();
});
export const leaveAssociation = handle(async (req, res) => {
  await endMembership(req.app.locals.ctx, req.account, req.association, req.account.id);
  return res.status(204).end();
});

export const inviteHandler = handle(async (req, res) => {
  const { email } = validate(Joi.object({ email: emailSchema.required() }), req.body);
  return res.status(201).json(await createInvitation(req.app.locals.ctx, req.account, req.association, email));
});
export const listInvitationsHandler = handle(async (req, res) =>
  res.json({ invitations: await listInvitations(req.app.locals.ctx, req.association) }));
export const revokeInvitationHandler = handle(async (req, res) => {
  await revokeInvitation(req.app.locals.ctx, req.account, req.association, idParam(req, 'id'));
  return res.status(204).end();
});
export const resendInvitationHandler = handle(async (req, res) =>
  res.json(await resendInvitation(req.app.locals.ctx, req.account, req.association, idParam(req, 'id'))));

const tokenBody = Joi.object({ token: Joi.string().max(100).required() });
export const lookupInvitationHandler = handle(async (req, res) =>
  res.json(await lookupInvitation(req.app.locals.ctx, validate(tokenBody, req.body).token)));

/** UC11: by token (link) or by id (the "Join" choice after verification, UC11 4c). */
export const acceptInvitationHandler = handle(async (req, res) => {
  const body = validate(Joi.object({ token: Joi.string().max(100), invitationId: uuid }).xor('token', 'invitationId'), req.body);
  const result = await acceptInvitation(req.app.locals.ctx, req.account, body);
  if (result.status === 'VERIFICATION_REQUIRED')
    return res.status(202).json({ message: 'Verify your email address, then join from the list of invitations.', ...result });
  return res.json(result);
});
