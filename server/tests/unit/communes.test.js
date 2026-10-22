import { COMMUNE_SEARCH_LIMIT, searchCommunes } from '../../domain/communes.js';

// Amendment A-B5: city picker search over the bundled INSEE reference (client spec decision K).

describe('searchCommunes', () => {
  test('matches a name prefix ignoring case, accents, hyphens and apostrophes', () => {
    expect(searchCommunes('saint etienne').map((c) => c.code)).toContain('42218');
    expect(searchCommunes('SAINT-ÉTIENNE')[0]).toEqual({ code: '42218', name: 'Saint-Étienne', department: '42' });
    expect(searchCommunes('l abergement').map((c) => c.name)).toEqual(expect.arrayContaining(["L'Abergement-Clémenciat"]));
  });

  test('puts the exact name first, then alphabetical order', () => {
    const names = searchCommunes('lyon').map((c) => c.name);
    expect(names[0]).toBe('Lyon');
    expect(names.slice(1)).toEqual([...names.slice(1)].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
  });

  test('a known INSEE code returns that commune only', () => {
    expect(searchCommunes('2a004')).toEqual([{ code: '2A004', name: 'Ajaccio', department: '2A' }]);
  });

  test('caps the result count and answers nothing for unknown or blank text', () => {
    expect(searchCommunes('sa')).toHaveLength(COMMUNE_SEARCH_LIMIT);
    expect(searchCommunes('zzzz')).toEqual([]);
    expect(searchCommunes(" -' ")).toEqual([]);
  });
});
