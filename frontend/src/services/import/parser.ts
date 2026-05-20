export type ParsedStatementItem = {
  date: string;         // ISO date string
  description: string;
  merchant: string;
  amount: number;       // negative = expense
  installment?: { current: number; total: number };
};

export type ParsedStatement = {
  reference: string;    // e.g. "Maio de 2026"
  closingDate: string;  // ISO date
  dueDate: string;      // ISO date
  total: number;
  items: ParsedStatementItem[];
};

export interface StatementParser {
  readonly name: string;
  /** Returns true if this parser can attempt to parse the given file. */
  supports(file: File): boolean;
  /** Extracts statement data from the file. May throw on parse errors. */
  parse(file: File): Promise<ParsedStatement>;
}
