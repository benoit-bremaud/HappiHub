# Bundled reference data

## communes.json (brick B, decision V)

Closed reference list for `event.venue_normalized_city`: one entry per current French commune
as `[inseeCode, name, department]`. Arrondissements, associated and delegated communes are
excluded (they are not city filter values).

- Source: INSEE, *Code officiel géographique* au 1er janvier 2026, file `v_commune_2026.csv`,
  https://www.insee.fr/fr/statistiques/fichier/8740222/v_commune_2026.csv
- Licence: Licence Ouverte / Open Licence Etalab 2.0 (attribution: INSEE).
- Downloaded 2026-10-19, SHA-256 `7be1153de3a63df48fa0ca77f8490c8a0c5c9c4eb12f5cec1ca7f70b0237b1d3`,
  34 875 communes.
- Regenerate: `node scripts/build-communes.js <path/to/v_commune_YYYY.csv>` from `server/`.

The Géoplateforme suggestion port replaces nothing here: it is added later (T11c) and its
results are still validated against this list.
