/** Compatibility types for callers of the shared runtime validator. */
export interface CommentData {
  content: string;
  event_id: string;
  user_id?: string;
}
export { commentValidation } from './commentValidation.js';
