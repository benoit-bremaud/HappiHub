import { PUBLIC_EVENT_STATUS } from '../utils/access.js';
/** Database translation of public visibility; domain rules do not depend on Mongo operators. */
export const publicEventFilter = () => ({ isPrivate: false, status: PUBLIC_EVENT_STATUS });
/** Restrict reads and participation to public approved events or the authenticated owner. */
export const readableEventFilter = (userId) => userId
  ? { $or: [{ creator: userId }, publicEventFilter()] }
  : publicEventFilter();
