import type { StatementParser, ParsedStatement, ParsedStatementItem } from "./parser";
import { extractPDFLines } from "./pdf-extractor";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** "3.153,26" → 3153.26  |  "-2.045,47" → -2045.47 */
function parseBRL(s: string): number {
  const sign = s.startsWith("-") ? -1 : 1;
  const clean = s.replace(/[^0-9,]/g, "").replace(",", ".");
  return sign * parseFloat(clean);
}

/**
 * Given a DD/MM date and the statement's due-date year/month, assign a year.
 * Transactions whose month is greater than the due month belong to the previous year
 * (e.g. Nov/Dec purchases appear on a January 2026 statement → 2025).
 */
function assignYear(dd: string, mm: string, dueYear: number, dueMonth: number): string {
  const month = parseInt(mm, 10);
  const year = month > dueMonth ? dueYear - 1 : dueYear;
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/**
 * A single extracted line can contain TWO transactions when the PDF uses a
 * two-column layout (common in the Despesas section of Santander statements).
 *
 * Strategy: split the line at every point that looks like a new transaction
 * start (optional contactless/PIX indicator + DD/MM + capital-letter text),
 * then parse each segment independently.
 */
function splitTransactionSegments(line: string): string[] {
  // Split ONLY at positions that come AFTER a BRL amount (e.g. "45,90").
  // This prevents splitting at installment fractions like "02/03" inside
  // a description ("CAFEBAR 02/03 123,76") which also look like DD/MM dates.
  // A real two-column boundary always has an amount before the next transaction.
  const segments = line.split(
    /(?<=\d{1,3}(?:\.\d{3})*,\d{2})\s+(?=(?:[3@◎✦✧]\s+)?\d{2}\/\d{2}\b\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÜ0-9*(])/,
  );
  return segments.map((s) => s.trim()).filter(Boolean);
}

/**
 * Amount pattern: optional leading minus, 1-3 digits, optional .000 groups, comma, 2 decimals.
 * e.g. 13,20 / 2.045,47 / -1.392,00
 */
const AMOUNT_RE = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

/** Parse one transaction segment into a ParsedStatementItem, or null if unrecognised. */
function parseSegment(
  segment: string,
  dueYear: number,
  dueMonth: number,
): ParsedStatementItem | null {
  // Strip leading indicator (contactless icon "3", "@", etc.)
  const stripped = segment.replace(/^[^A-Z0-9\d-]*/, "").trim();

  // Must start with DD/MM
  const dateMatch = stripped.match(/^(\d{2})\/(\d{2})\s+(.+)$/);
  if (!dateMatch) return null;

  const [, dd, mm, rest] = dateMatch;

  // Must contain a BRL amount
  const amounts = [...rest.matchAll(new RegExp(AMOUNT_RE.source, "g"))];
  if (amounts.length === 0) return null;

  // The BRL amount is the LAST numeric match (USD amount, if any, comes after)
  // BUT if the last two matches look like "14,88 2,60" (BRL + USD), the
  // second-to-last is BRL and the last is USD.
  let brlAmountStr: string;
  let descAndInstallment: string;

  if (amounts.length >= 2) {
    // Heuristic: if the last amount is small (< 1000) and appears right after
    // the penultimate amount with no description text, treat penultimate as BRL.
    const last = amounts[amounts.length - 1];
    const prev = amounts[amounts.length - 2];
    const between = rest.slice(
      prev.index! + prev[0].length,
      last.index!,
    ).trim();
    if (between === "" || /^[A-Z]{2,3}$/.test(between)) {
      // No text between → last is USD, prev is BRL
      brlAmountStr = prev[0];
      descAndInstallment = rest.slice(0, prev.index!).trim();
    } else {
      brlAmountStr = last[0];
      descAndInstallment = rest.slice(0, last.index!).trim();
    }
  } else {
    brlAmountStr = amounts[0][0];
    descAndInstallment = rest.slice(0, amounts[0].index!).trim();
  }

  const amount = parseBRL(brlAmountStr);

  // Extract installment (XX/YY) from the end of descAndInstallment
  let description = descAndInstallment;
  let installment: { current: number; total: number } | undefined;

  const installMatch = descAndInstallment.match(/^(.*?)\s+(\d{2})\/(\d{2})\s*$/);
  if (installMatch) {
    const cur = parseInt(installMatch[2], 10);
    const tot = parseInt(installMatch[3], 10);
    if (cur >= 1 && tot >= 1 && cur <= tot && tot <= 99) {
      description = installMatch[1].trim();
      installment = { current: cur, total: tot };
    }
  }

  if (!description) return null;

  return {
    date: assignYear(dd, mm, dueYear, dueMonth),
    description,
    merchant: extractMerchant(description),
    amount,
    installment,
  };
}

/** Best-effort merchant name extraction (strip payment-platform prefixes like "MP *", "EC *"). */
function extractMerchant(desc: string): string {
  return desc
    .replace(/^(?:MP|EC|DM|ZIG|PIX)\s*\*?\s*/i, "")
    .split(/\s{2,}/)[0]
    .trim();
}

// ─── Section detection ────────────────────────────────────────────────────────

const SEC_DETAIL    = /detalhamento\s+da\s+fatura/i;
const SEC_SUMMARY   = /resumo\s+da\s+fatura/i;
const SEC_PAYMENT   = /pagamento\s+e\s+demais\s+cr[eé]ditos/i;
const SEC_INSTALL   = /\bparcelamentos\b/i;   // no anchors — handles two-column merge
const SEC_EXPENSES  = /\bdespesas\b/i;          // same
const SEC_TABLE_HDR = /compra\s+data\s+descri/i;
const CARD_HEADER   = /[A-Z].+[-–]\s*\d{4}\s+[Xx*]+\s+[Xx*]+\s+\d{4}/;
// .+? skips any chars (including digits in R$3.153,26) until DD/MM/YYYY
const DUE_DATE_RE   = /vencimento.+?(\d{2})\/(\d{2})\/(\d{4})/i;
// "1 Pagamento Total R$3.153,26" is the correct due amount (not the installment offer)
const TOTAL_RE      = /\bpagamento\s+total\b\s*R?\$?\s*([\d.]+,\d{2})/i;
const CLOSING_RE    = /realizados\s+at[eé]\s+(\d{2})\/(\d{2})/i;

// ─── Main parser ──────────────────────────────────────────────────────────────

export class SantanderStatementParser implements StatementParser {
  readonly name = "Santander PDF Parser";

  supports(file: File): boolean {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  }

  async parse(file: File): Promise<ParsedStatement> {
    const lines = await extractPDFLines(file);

    // ── 1. Scan full document for header metadata ──────────────────────────
    let dueDay = "01", dueMM = "01", dueYear = new Date().getFullYear();
    let dueFound = false;
    let closingDay = "01", closingMM = "12";
    let total = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Combine current + next line so DUE_DATE_RE can match even when
      // "Vencimento" and "01/01/2026" appear in adjacent PDF table rows.
      if (!dueFound) {
        const twoLines = line + " " + (lines[i + 1] ?? "");
        const dueMatch = twoLines.match(DUE_DATE_RE);
        if (dueMatch) {
          dueDay  = dueMatch[1];
          dueMM   = dueMatch[2];
          dueYear = parseInt(dueMatch[3], 10);
          dueFound = true;
        }
      }

      const totalMatch = line.match(TOTAL_RE);
      if (totalMatch && total === 0) {
        total = parseBRL(totalMatch[1]);
      }

      const closingMatch = line.match(CLOSING_RE);
      if (closingMatch) {
        closingDay = closingMatch[1];
        closingMM  = closingMatch[2];
      }
    }

    const dueMonth = parseInt(dueMM, 10);
    const closingYear = dueMonth === 1 ? dueYear - 1 : dueYear;
    const dueDate     = `${dueYear}-${dueMM.padStart(2, "0")}-${dueDay.padStart(2, "0")}`;
    const closingDate = `${closingYear}-${closingMM.padStart(2, "0")}-${closingDay.padStart(2, "0")}`;

    // Derive reference period label (e.g. "Dezembro 2025")
    const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const reference = `${MONTHS[parseInt(closingMM, 10) - 1]} ${closingYear}`;

    // ── 2. Extract only the "Detalhamento da Fatura" section ─────────────
    let inDetail   = false;
    let inPayments = false;   // true while inside "Pagamento e Demais Créditos"
    const items:   ParsedStatementItem[] = [];
    const credits: ParsedStatementItem[] = [];

    for (const line of lines) {
      // Enter detail section
      if (!inDetail) {
        if (SEC_DETAIL.test(line)) inDetail = true;
        continue;
      }

      // Leave detail section when we hit the summary
      if (SEC_SUMMARY.test(line)) break;

      // Strip table-header and card-banner text first; preserve any trailing
      // transaction data the two-column layout may have merged onto the same line.
      let parseable = line.replace(SEC_TABLE_HDR, "").trim();
      parseable = parseable.replace(CARD_HEADER, "").trim();

      // Detect sub-section changes; strip the keyword and keep trailing content
      // so a Despesas item merged onto the same line still gets parsed.
      if (SEC_PAYMENT.test(parseable))  { inPayments = true;  continue; }
      if (SEC_INSTALL.test(parseable))  { inPayments = false; parseable = parseable.replace(SEC_INSTALL,  "").trim(); }
      if (SEC_EXPENSES.test(parseable)) { inPayments = false; parseable = parseable.replace(SEC_EXPENSES, "").trim(); }

      // Skip payment/credit lines (negative entries — we only want expenses)
      if (!parseable) continue;

      // Each line may hold 1 or 2 transactions (two-column PDF layout)
      for (const segment of splitTransactionSegments(parseable)) {
        const item = parseSegment(segment, dueYear, dueMonth);
        if (!item) continue;
        if (inPayments) {
          // Credit entry — store with positive amount for display
          credits.push({ ...item, amount: Math.abs(item.amount) });
        } else if (item.amount > 0) {
          items.push(item);
        }
      }
    }

    if (items.length === 0) {
      throw new Error(
        "Não foi possível extrair transações. Verifique se é uma fatura Santander válida.",
      );
    }

    return { reference, closingDate, dueDate, total, items, credits };
  }
}
