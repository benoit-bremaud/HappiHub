import { jwtDecode } from 'jwt-decode';
/** Reject malformed and expired browser credentials; the server remains authoritative. */
export const decodeSession = (token) => {
  try {
    const value = jwtDecode(token);
    return typeof value._id === 'string' && Number.isInteger(value.exp) && value.exp * 1000 > Date.now() ? value : null;
  } catch {
    return null;
  }
};
