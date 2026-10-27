/** Same as the shop's toSlug: "Lofi Cat #2" → "lofi-cat-2". */
export function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** A short id for a new option or choice ("size", "a3"), unique in its list. */
export function optionId(label: string, taken: string[]) {
  const base = toSlug(label).slice(0, 30) || "opt";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}
