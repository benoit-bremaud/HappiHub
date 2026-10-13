export const PUBLIC_EVENT_STATUS = 'approved';

/** Only approved public events are anonymously visible; owners can read their own events. */
export const canReadEvent = (event, user) => Boolean(event && (
  (event.isPrivate === false && event.status === PUBLIC_EVENT_STATUS) ||
  (user && String(event.creator) === user._id)
));
/** Project readable event content without exposing creator or participant identifiers. */
export const eventSummary = (event) => ({
  _id: event._id, title: event.title, description: event.description,
  date: event.date, location: event.location, image: event.image,
  isPrivate: event.isPrivate, status: event.status,
});
