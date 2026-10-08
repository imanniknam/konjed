export type Cta = { label: string; href: string; variant?: "primary" | "secondary" | "ghost" };

export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "select" | "radio" | "url" | "password" | "number";
  options?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

export type CardItem = {
  title: string;
  text?: string;
  tag?: string;
  /** label → value rows (e.g. «مهارت: خلاقیت») */
  meta?: { label: string; value: string }[];
  chips?: string[];
  status?: string;
  cta?: Cta;
  art?: string;
};

export type Section =
  | { kind: "prose"; id?: string; eyebrow?: string; title: string; paragraphs?: string[]; ctas?: Cta[]; note?: string }
  | { kind: "cards"; id?: string; eyebrow?: string; title: string; text?: string; items: CardItem[]; cols?: 2 | 3 | 4; note?: string; cta?: Cta }
  | { kind: "steps"; id?: string; title: string; text?: string; items: { title: string; text: string }[] }
  | { kind: "skills"; id?: string; title: string; text?: string; groups: { title: string; text?: string; items: string[]; cta?: Cta; games?: string[] }[] }
  | { kind: "chips"; id?: string; title: string; text?: string; items: string[]; linkTo?: string }
  | { kind: "bullets"; id?: string; title: string; lead?: string; text?: string; items: string[]; cta?: Cta }
  | { kind: "faq"; id?: string; title: string; items: { q: string; a: string }[] }
  | { kind: "form"; id?: string; title: string; text?: string; fields: Field[]; submit: string; endpoint: string }
  | { kind: "registeringCourses"; id?: string; title: string; text?: string; note?: string }
  | { kind: "projectsFeed"; id?: string; title: string; text?: string }
  | { kind: "projectForm"; id?: string; title: string; text?: string }
  | { kind: "challengesLive"; id?: string }
  | { kind: "achievementsLive"; id?: string }
  | { kind: "mySubmissions"; id?: string; title: string; text?: string }
  | { kind: "stats"; id?: string; title: string; items: { value: string; label: string }[] }
  | { kind: "gamesRow"; id?: string; eyebrow?: string; title: string; text?: string; ids: string[]; cta?: Cta }
  | { kind: "catalog"; id?: string; title?: string; text?: string; variant?: "basic" | "filters"; initialSkill?: string }
  | { kind: "soon"; id?: string; title: string; text: string; cta?: Cta; note?: string }
  | { kind: "emptyState"; title: string; text: string; cta: Cta }
  | { kind: "cta"; id?: string; title: string; text: string; ctas: Cta[]; authCta?: Cta };

export type PageTheme = "arcade" | "school" | "showcase" | "about" | "publish";

export type PageData = {
  slug: string;
  title: string;
  /** document title for <title> */
  seo: string;
  theme: PageTheme;
  hero: { eyebrow?: string; title: string; text: string[]; ctas: Cta[]; art?: string };
  sections: Section[];
};
