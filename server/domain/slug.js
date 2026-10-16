/** Lowercase ASCII slug from an association name (spec § 4); never empty. */
export const slugify = (name) => {
  const base = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  return base || 'association';
};

/** First free slug: the base, then base-2, base-3… (UC1 4b). */
export const nextFreeSlug = (base, taken) => {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
};
