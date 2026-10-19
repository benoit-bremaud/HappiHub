// Operator step (brick B decision V): convert the INSEE "Code officiel géographique" commune
// list into the bundled reference `domain/data/communes.json`.
// Usage: node scripts/build-communes.js <path/to/v_commune_YYYY.csv>. Source and licence: domain/data/README.md.
import { readFileSync, writeFileSync } from 'node:fs';

const [source] = process.argv.slice(2);
if (!source) throw new Error('Usage: node scripts/build-communes.js <v_commune_YYYY.csv>');

/** Split one CSV line whose fields are all double-quoted ("" escapes a quote). */
const fields = (line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) => match[1].replaceAll('""', '"'));

const [header, ...lines] = readFileSync(source, 'utf8').trim().split(/\r?\n/).map(fields);
const column = (name) => header.indexOf(name);
const [type, code, department, label] = ['TYPECOM', 'COM', 'DEP', 'LIBELLE'].map(column);
// Current communes only: arrondissements, associated and delegated communes are not filter values.
const communes = lines.filter((row) => row[type] === 'COM').map((row) => [row[code], row[label], row[department]]);
writeFileSync(new URL('../domain/data/communes.json', import.meta.url), `${JSON.stringify(communes)}\n`);
console.log(`${communes.length} communes written`);
