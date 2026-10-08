/** Persian number / date helpers usable from both server and client components. */
export const toFa = (n: number | string) => Number(n).toLocaleString("fa-IR");
export const dateFa = (d: string | Date) => new Date(d).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
