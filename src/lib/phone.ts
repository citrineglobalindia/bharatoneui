// Indian mobile rules: digits only, 10 digits, must start with 6-9.
export function sanitizeMobile(v: string): string {
  let d = (v || "").replace(/\D/g, "");
  while (d.length && "012345".includes(d[0])) d = d.slice(1); // never start 0-5
  return d.slice(0, 10);
}
export const isValidMobile = (v: string) => /^[6-9]\d{9}$/.test((v || "").replace(/\D/g, ""));
