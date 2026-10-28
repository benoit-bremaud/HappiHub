import express from 'express';
import { authenticateSession as auth, requireMembership as member } from '../middleware/auth.js';
import {
  confirmResetHandler, createAssociationHandler, deleteAccountHandler, exportHandler, getAccount, getSession,
  requestResetHandler, resendVerificationHandler, signIn, signOut, signUpHandler, updateAccountHandler, verifyEmailHandler,
} from '../controllers/accountController.js';
import {
  acceptInvitationHandler, closeAssociationHandler, getAssociation, inviteHandler, leaveAssociation,
  listInvitationsHandler, lookupInvitationHandler, removeMember, resendInvitationHandler, revokeInvitationHandler,
  updateAssociation,
} from '../controllers/associationController.js';
import {
  cancelEventHandler, createEventHandler, deleteEventHandler, editEventHandler, listEventsHandler, publishEventHandler,
  listPublicCitiesHandler, listPublicEventsHandler, readEventHandler, readPublicEventHandler, searchCommunesHandler,
} from '../controllers/eventController.js';

/** Brick D and brick B endpoints (specs § 5); `limits` are the per-IP limiters created by the app. */
export const apiRoutes = (limits) => {
  const router = express.Router();
  router.get('/session', limits.bootstrap, getSession);
  router.post('/session', limits.signInPerIp, limits.signInPerPair, signIn);
  router.delete('/session', signOut);
  router.post('/signup', limits.signUp, signUpHandler);

  router.post('/email-verification', verifyEmailHandler);
  router.post('/email-verification/resend', limits.emails, resendVerificationHandler);
  router.post('/password-reset', limits.emails, requestResetHandler);
  router.post('/password-reset/confirm', confirmResetHandler);

  router.get('/account', auth, getAccount);
  router.patch('/account', auth, updateAccountHandler);
  router.get('/account/export', auth, exportHandler);
  router.delete('/account', auth, deleteAccountHandler);

  router.post('/associations', auth, createAssociationHandler);
  router.get('/associations/:slug', auth, member, getAssociation);
  router.patch('/associations/:slug', auth, member, updateAssociation);
  router.post('/associations/:slug/close', auth, member, closeAssociationHandler);
  router.post('/associations/:slug/leave', auth, member, leaveAssociation);
  router.delete('/associations/:slug/members/:accountId', auth, member, removeMember);
  router.get('/associations/:slug/invitations', auth, member, listInvitationsHandler);
  router.post('/associations/:slug/invitations', auth, member, inviteHandler);
  router.delete('/associations/:slug/invitations/:id', auth, member, revokeInvitationHandler);
  router.post('/associations/:slug/invitations/:id/resend', auth, member, resendInvitationHandler);

  router.post('/invitations/lookup', lookupInvitationHandler);
  router.post('/invitations/accept', auth, acceptInvitationHandler);

  const events = '/associations/:slug/events';
  router.get(events, auth, member, listEventsHandler);
  router.post(events, limits.eventWrites, auth, member, createEventHandler);
  router.get(`${events}/:id`, auth, member, readEventHandler);
  router.patch(`${events}/:id`, limits.eventWrites, auth, member, editEventHandler);
  router.post(`${events}/:id/publish`, limits.eventWrites, auth, member, publishEventHandler);
  router.post(`${events}/:id/cancel`, limits.eventWrites, auth, member, cancelEventHandler);
  router.post(`${events}/:id/delete`, limits.eventWrites, auth, member, deleteEventHandler);
  router.get('/events', limits.publicReads, listPublicEventsHandler);
  router.get('/events/cities', limits.publicReads, listPublicCitiesHandler);
  router.get('/events/:id', limits.publicReads, readPublicEventHandler);
  router.get('/communes', limits.publicReads, searchCommunesHandler);

  // Legacy comment routes stay disabled until the participation/comment brick (D3, decision S3).
  router.all(['/comments', '/comments/*'], (_req, res) =>
    res.status(503).json({ message: 'Comments are temporarily unavailable.' }));
  return router;
};
