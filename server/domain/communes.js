import communes from './data/communes.json' with { type: 'json' };

// Decision V / A-B2: closed reference of current French communes, keyed by INSEE code.
const BY_CODE = new Map(communes.map(([code, name, department]) => [code, { code, name, department }]));

/** The commune for an INSEE code, or null when the code is not in the reference list. */
export const findCommune = (code) => BY_CODE.get(code) ?? null;
