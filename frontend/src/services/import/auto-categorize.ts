/**
 * Keyword-based auto-categorizer.
 * Maps a merchant / description string to one of the seeded category IDs.
 * Rules are evaluated in order; first match wins. Falls back to "casa".
 */

const RULES: Array<{ pattern: RegExp; categoryId: string }> = [
  // ── Streaming & digital subscriptions ────────────────────────────────────
  {
    pattern:
      /NETFLIX|SPOTIFY|DISNEY|HBO|APPLE TV|YOUTUBE PREMIUM|DEEZER|AMAZON PRIME|PRIME VIDEO|PRIME CANAL|GLOBOPLAY|MUBI|PARAMOUNT|CRUNCHYROLL/i,
    categoryId: "streaming",
  },

  // ── Recurring digital subscriptions (SaaS, cloud, membership) ────────────
  {
    pattern:
      /APPLE\s*COM[\s/]BILL|ICLOUD|GITHUB|LINKEDIN|MICROSOFT|GOOGLE ONE|DROPBOX|NOTION|FIGMA|CANVA|SLACK|ZOOM|SCP\s*MAIS|UBER\s*[\*-]\s*ONE|CONSORCIO/i,
    categoryId: "assinaturas",
  },

  // ── Supermarket / grocery ─────────────────────────────────────────────────
  {
    pattern:
      /MERCADO|SUPERMERCADO|ATACAD[AO]|NATURAL DA TERRA|HORTIFRUTI|EMPORIO|MERCEARIA/i,
    categoryId: "mercado",
  },

  // ── Transport ─────────────────────────────────────────────────────────────
  {
    pattern:
      /\bUBER\b|BUSER|99\s*APP|\b99\b|LYFT|CABIFY|PARKING|MULTIPARK|AUTOPOST|POSTO\s|COMBUSTIV|ALE\s*PARK|SPEEDPA|ESTACION|GARAGEM|BILHETE|METR[OÔ]|ONIBUS|PASSAGEM/i,
    categoryId: "transporte",
  },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  {
    pattern: /DROGARIA|FARMACIA|ULTRAFARMA|DROGA|RAIA|PACHECO|DROGASIL|ULTRAFARMA/i,
    categoryId: "farmacia",
  },

  // ── Health ───────────────────────────────────────────────────────────────
  {
    pattern:
      /CLINIC|HOSPITAL|LABORAT|PLANO\s*DE\s*SA[UÚ]DE|ODONTO|NUTRICAR|SA[UÚ]DE|HEALTH|ACADEMIA|CROSSFIT|SMARTFIT|BLUEFIT/i,
    categoryId: "saude",
  },

  // ── Leisure / entertainment ───────────────────────────────────────────────
  {
    pattern:
      /TICKETMASTER|INGRESSO|CINEMA|TEATRO|SHOW\b|PARQUE|URBIA|TICKETS|PIPOCA|BILHETERIA|INGRESSORAPIDO|EVENTBRITE|ESPORTE|FUTEBOL|MARACANA/i,
    categoryId: "lazer",
  },

  // ── Education ─────────────────────────────────────────────────────────────
  {
    pattern:
      /ESCOLA|FACULDADE|UNIVERSIDADE|UDEMY|COURSERA|ALURA|EDUCA|LIVRAR|LIVRARIA|AMAZON\s*BOOKS|PEARSON|DESCOMPLICA/i,
    categoryId: "educacao",
  },

  // ── Food & restaurants (broad — place AFTER more specific categories) ─────
  {
    pattern:
      /MCDONALDS|BURGER|SUBWAY|PIZZA|RESTAURANTE|LANCHERIA|CАФЕ|CAFE|CAFEBAR|PADARIA|PAO\s|LC\s*GOURMET|CASABLANCA|LAREIRA|RODOSNACK|TENDA\s|BELATRIX|MINISTOP|\bDOM\b|COUTOSPIZZA|VILLAGGIO|UTF\s*ICARAI|SANTA\s*MARTA|ZIG\s*\*FRIENDS|BLU\s*\*PIZ|HAMBURGER|SUSHI|JAPONESA|ITALIANA|CHURRASCARIA|SORVETERIA|SORVETE|AÇAI|ACAI|FOOD|DELI\b|SNACK|BAKERY|BISTRO|BRASA|FRANGO/i,
    categoryId: "alimentacao",
  },
];

const DEFAULT_CATEGORY = "outros";

export function autoCategorize(description: string): string {
  const upper = description.toUpperCase();
  for (const { pattern, categoryId } of RULES) {
    if (pattern.test(upper)) return categoryId;
  }
  return DEFAULT_CATEGORY;
}
