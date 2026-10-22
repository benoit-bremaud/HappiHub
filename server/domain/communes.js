import communes from './data/communes.json' with { type: 'json' };

// Decision V / A-B2: closed reference of current French communes, keyed by INSEE code.
const BY_CODE = new Map(communes.map(([code, name, department]) => [code, { code, name, department }]));

/** Lowercase, accents removed, hyphens and apostrophes as spaces: "Saint-Étienne" → "saint etienne". */
const fold = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[-'’\s]+/g, ' ').trim();

const FOLDED = [...BY_CODE.values()].map((commune) => ({ commune, key: fold(commune.name) }));

export const COMMUNE_SEARCH_LIMIT = 20;

/** The commune for an INSEE code, or null when the code is not in the reference list. */
export const findCommune = (code) => BY_CODE.get(code) ?? null;

/**
 * City picker search (amendment A-B5): name prefix, accent- and punctuation-insensitive, exact
 * names first then alphabetical; a five-character INSEE code returns that commune.
 */
export const searchCommunes = (query, limit = COMMUNE_SEARCH_LIMIT) => {
  const byCode = findCommune(query.trim().toUpperCase());
  if (byCode) return [byCode];
  const prefix = fold(query);
  if (!prefix) return [];
  return FOLDED.filter(({ key }) => key.startsWith(prefix))
    .sort((a, b) => (a.key === prefix ? 0 : 1) - (b.key === prefix ? 0 : 1) || a.key.localeCompare(b.key, 'fr'))
    .slice(0, limit)
    .map(({ commune }) => commune);
};
