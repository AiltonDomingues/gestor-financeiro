import type { StatementParser, ParsedStatement } from "./parser";

export class SantanderStatementParser implements StatementParser {
  readonly name = "Santander PDF Parser";

  supports(file: File): boolean {
    return (
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
  }

  async parse(_file: File): Promise<ParsedStatement> {
    // TODO: Implement PDF text extraction.
    // Steps:
    //  1. Load the file with pdf.js (pdfjs-dist)
    //  2. Extract raw text from all pages
    //  3. Parse the header block for reference period, closing date, due date
    //  4. Parse each line item: date, description, amount
    //  5. Detect installments ("PARCELA X/Y")
    //  6. Return ParsedStatement
    throw new Error(
      "Santander PDF parsing is not yet implemented. " +
        "The upload flow is ready — add PDF extraction to complete this step.",
    );
  }
}
