/** Display helpers for the Factory Portal. Spec values are enum ids such as "three_quarter". */

export const shortId = (id: string) => id.slice(0, 8);

export function humanize(value: string): string {
  const s = value.replace(/_/g, "-");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "zipper", "buttons" → "Zipper, Buttons"; an empty list or ["none"] → "None". */
export function humanList(values: string[]): string {
  const v = values.filter((x) => x && x !== "none");
  return v.length ? v.map(humanize).join(", ") : "None";
}

export const money = (n: number) => `$${n.toFixed(2)}`;
