import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// AC15: every query text is a constant. Values travel only as $n parameters; the only
// interpolation allowed in a template is an UPPER_CASE module constant (shared column lists).
const ROOT = join(__dirname, '..', '..');
const SOURCE_DIRS = ['controllers', 'db', 'domain', 'jobs', 'middleware', 'routes', 'services', 'config', 'utils'];
const files = SOURCE_DIRS.flatMap((dir) => readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.js')).map((f) => join(ROOT, dir, f)));

/** Return the first argument source of every `.query(` call. */
const queryArguments = (source) => {
  const found = [];
  let index = source.indexOf('.query(');
  while (index !== -1) {
    let i = index + '.query('.length;
    while (/\s/.test(source[i])) i += 1;
    const quote = source[i];
    if (['`', "'", '"'].includes(quote)) {
      let end = i + 1;
      while (source[end] !== quote) end += source[end] === '\\' ? 2 : 1;
      let after = end + 1;
      while (/\s/.test(source[after])) after += 1;
      found.push({ text: source.slice(i, end + 1), next: source[after] });
    } else {
      found.push({ text: source.slice(i, source.indexOf(',', i)), next: ',' });
    }
    index = source.indexOf('.query(', index + 1);
  }
  return found;
};

test('repository modules never build query text from input', () => {
  const offenders = [];
  for (const file of files) {
    for (const { text, next } of queryArguments(readFileSync(file, 'utf8'))) {
      const interpolations = [...text.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1].trim());
      const identifier = !/^[`'"]/.test(text);
      if (next === '+' || interpolations.some((name) => !/^[A-Z_]+$/.test(name)) ||
        (identifier && !/^[A-Z_]+$/.test(text.trim()))) offenders.push(`${file}: ${text.slice(0, 60)}`);
    }
  }
  expect(files.length).toBeGreaterThan(10);
  expect(offenders).toEqual([]);
});

test('the check catches concatenation and interpolated input', () => {
  const unsafe = "db.query('SELECT * FROM account WHERE email = ' + email); db.query(`SELECT ${column} FROM x`);";
  const [concat, template] = queryArguments(unsafe);
  expect(concat.next).toBe('+');
  expect(template.text).toContain('${column}');
});
