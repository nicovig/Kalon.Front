export function parseAmountFromCell(value: string): number | null {
  const v = value.trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(v);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

export function parseDateFromCell(value: string): Date | null {
  const v = value.trim();
  if (!v) {
    return null;
  }
  const iso = Date.parse(v);
  if (!Number.isNaN(iso)) {
    return new Date(iso);
  }
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const d = +m[1];
    const mo = +m[2] - 1;
    const y = m[3].length === 2 ? +m[3] + 2000 : +m[3];
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}
