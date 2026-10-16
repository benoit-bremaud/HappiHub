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

/** Brick D endpoints (spec § 5); `limits` are the per-IP limiters created by the app. */
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

  // Legacy event and comment routes are disabled until brick B rebuilds events (decision S3).
  router.all(['/events', '/events/*', '/comments', '/comments/*'], (_req, res) =>
    res.status(503).json({ message: 'Events are temporarily unavailable.' }));
  return router;
};
