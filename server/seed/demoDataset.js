// Demo dataset of the test-environment spec (§§ 3–4). Every address is under the reserved
// `demo.example.com` (D8) and every association name starts with `Demo ` (natural keys, D3).

export const DEMO_DOMAIN = 'demo.example.com';
const DAY = 24 * 3600e3;
const HOUR = 3600e3;

const email = (local) => `${local}@${DEMO_DOMAIN}`;

/** Personas P1–P8 (§ 3). `verified: false` leaves the account unverified (P5). */
export const DEMO_ACCOUNTS = Object.freeze([
  { key: 'P1', email: email('claire'), displayName: 'Claire Dubois-Lefèvre' },
  { key: 'P2', email: email('malik'), displayName: 'Malik Benali' },
  { key: 'P3', email: email('sofia'), displayName: 'Sofía Martínez' },
  { key: 'P4', email: email('hugo'), displayName: 'Hugo Moreau' },
  { key: 'P5', email: email('nora'), displayName: 'Nora Haddad', verified: false },
  { key: 'P6', email: email('paul'), displayName: 'Paul Girard', pendingEmail: email('paul.new') },
  { key: 'P7', email: email('lea'), displayName: 'Léa Fontaine', platformRole: 'MODERATOR' },
  { key: 'P8', email: email('marc'),
    displayName: 'Marc-Antoine Delacroix-Saint-Exupéry de la Villemarqué, trésorier bénévole' },
]);

/** Every address the seed may write, including pending emails (reset and outbox namespace). */
export const DEMO_ADDRESSES = Object.freeze(DEMO_ACCOUNTS.flatMap((a) => [a.email, a.pendingEmail].filter(Boolean)));

/** Associations A1–A4 (§ 4.1), each created by its owner; `members` join by invitation. */
export const DEMO_ASSOCIATIONS = Object.freeze([
  { key: 'A1', name: 'Demo Tréteaux du Quartier', owner: 'P1', members: ['P2'], pendingInvitations: ['P4'] },
  { key: 'A2', name: 'Demo Chorale du Canal', owner: 'P3' },
  { key: 'A3', name: 'Demo Atelier fermé', owner: 'P7', closed: true },
  ...[1, 2, 3, 4, 5].map((n) => ({ key: `A4-${n}`, name: `Demo Marc ${n}`, owner: 'P8' })),
]);

const PARIS = '75056';
const venue = (label, city = PARIS) => ({ venueLabel: label, venueAddress: '12 rue des Lilas', venueCity: city });
// Validation trims text, so the last character is never whitespace and the length stays exact.
const exactly = (text, length) => text.repeat(Math.ceil(length / text.length)).slice(0, length).replace(/\s$/, '.');
const at = (ms) => new Date(ms).toISOString();

/**
 * Events E1–E20 (§ 4.2) relative to the run time `now`, so future events stay future. Optional
 * steps: `createdAgo` (seed clock in the past, D6), `publish`, `cancelReason`, `edit` (by another
 * member), `hide` (the E19 SQL exception), `maintenance` (state reached by the job, D6).
 */
export const demoEvents = (now) => {
  const future = (days, hour = 20) => at(Math.floor(now / DAY) * DAY + days * DAY + hour * HOUR);
  const published = (key, association, by, title, type, days, extra) => ({ key, association, by, publish: true,
    body: { title, type, shortDescription: `${title} : une soirée proposée par l'association.`,
      startsAt: future(days), ...venue('Salle des fêtes'), priceKind: 'FREE', posterStyle: 'classic', ...extra } });
  return [
    published('E1', 'A1', 'P1', 'Le Malade imaginaire', 'THEATRE', 3, { posterStyle: 'classic' }),
    published('E2', 'A1', 'P2', 'Concert de printemps 🎶', 'CONCERT', 5,
      { priceKind: 'AMOUNT', priceAmountCents: 1200, posterStyle: 'bold' }),
    published('E3', 'A2', 'P3', 'Exposition « Regards croisés »', 'EXHIBITION', 7,
      { priceKind: 'PAY_WHAT_YOU_WANT', posterStyle: 'paper', venueCity: '69123' }),
    published('E4', 'A1', 'P1', 'Atelier masques et costumes', 'WORKSHOP', 9, { posterStyle: 'night' }),
    published('E5', 'A2', 'P3', 'Bal folk du canal', 'DANCE', 11, { posterStyle: 'pastel', venueCity: '13055' }),
    published('E6', 'A1', 'P1', 'Ciné-club : <script>alert(1)</script>', 'CINEMA', 13, { posterStyle: 'minimal' }),
    published('E7', 'A2', 'P3', 'Conférence مرحبا : chant et mémoire', 'TALK', 15,
      { posterStyle: 'classic', priceKind: 'AMOUNT', priceAmountCents: 500 }),
    published('E8', 'A1', 'P2', 'Scène ouverte du quartier', 'OTHER', 17, { posterStyle: 'bold', venueCity: '31555' }),
    published('E9', 'A2', 'P3', 'Chorale en plein air', 'CONCERT', 19,
      { posterStyle: 'paper', priceKind: 'PAY_WHAT_YOU_WANT', venueCity: '33063' }),
    published('E10', 'A1', 'P1', 'Lecture théâtralisée', 'THEATRE', 21, { posterStyle: 'night', venueCity: '44109' }),
    published('E11', 'A1', 'P1', exactly('Le très long titre de la soirée théâtrale ', 120), 'THEATRE', 23, {
      shortDescription: exactly('Une description courte qui atteint exactement la limite. ', 280),
      longDescription: exactly('Un long paragraphe de présentation.\n', 9990) }),
    { key: 'E12', association: 'A1', by: 'P1', publish: true, createdAgo: 3 * DAY, body: {
      title: 'Concert commencé avant-hier', type: 'CONCERT', shortDescription: 'Sans heure de fin.',
      startsAt: at(now - 3 * DAY + HOUR), ...venue('Kiosque'), priceKind: 'FREE', posterStyle: 'bold' } },
    published('E13', 'A1', 'P1', 'Flash mob de durée nulle', 'DANCE', 25, {}),
    published('E14', 'A2', 'P3', 'Exposition à Ajaccio', 'EXHIBITION', 27,
      { ...venue('Musée Fesch, salle « Bonaparte »', '2A004') }),
    { key: 'E15', association: 'A1', by: 'P1', body: { title: 'Brouillon minimal', type: 'WORKSHOP' } },
    { key: 'E16', association: 'A1', by: 'P1', createdAgo: 395 * DAY, maintenance: true,
      body: { title: 'Ancien brouillon oublié', type: 'TALK' } },
    published('E17', 'A1', 'P1', 'Projection annulée', 'CINEMA', 30, {}),
    { key: 'E18', association: 'A2', by: 'P3', publish: true, createdAgo: 10 * DAY, maintenance: true, body: {
      title: 'Exposition terminée', type: 'OTHER', shortDescription: 'Archivée après sa fin.',
      startsAt: at(now - 10 * DAY + HOUR), endsAt: at(now - 10 * DAY + 3 * HOUR), ...venue('Galerie du canal'),
      priceKind: 'FREE', posterStyle: 'pastel' } },
    published('E19', 'A1', 'P1', 'Spectacle masqué par la modération', 'THEATRE', 32, {}),
    published('E20', 'A1', 'P1', 'Concert déplacé', 'CONCERT', 34, {}),
  ].map((event) => ({
    ...event,
    ...(event.key === 'E13' && { body: { ...event.body, endsAt: event.body.startsAt } }),
    ...(event.key === 'E17' && { cancelReason: exactly('Annulé pour raison de force majeure. ', 500) }),
    ...(event.key === 'E19' && { hide: true }),
    ...(event.key === 'E20' && { edit: { by: 'P2', changes: { startsAt: future(35, 19), venueLabel: 'Grande salle' } } }),
  }));
};
