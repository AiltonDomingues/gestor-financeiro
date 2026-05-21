import type { ImportJob, Statement, Transaction } from "../../domain/types";
import { db } from "../../data/db";
import { SantanderStatementParser } from "./santander-parser";
import { autoCategorize } from "./auto-categorize";
import type { ParsedStatementItem } from "./parser";

const parsers = [new SantanderStatementParser()];

export type ImportStatementOptions = {
  file: File;
  cardId: string;
  /** Pre-reviewed items with user-confirmed category IDs (from the review step). */
  reviewedItems?: Array<{ item: ParsedStatementItem; categoryId: string }>;
};

/**
 * Orchestrates the full import flow for a single statement file:
 *  1. Creates an ImportJob record
 *  2. Finds a matching parser
 *  3. Parses the file
 *  4. Persists the Statement + Transactions
 *  5. Updates the ImportJob status
 *
 * Returns the final ImportJob; throws on unrecoverable errors.
 */
export async function importStatement({
  file,
  cardId,
  reviewedItems,
}: ImportStatementOptions): Promise<ImportJob> {
  const jobId = crypto.randomUUID();

  const initialJob: ImportJob = {
    id: jobId,
    file: file.name,
    date: new Date().toISOString(),
    origin: detectOrigin(cardId),
    items: 0,
    errors: 0,
    duplicates: 0,
    status: "pending",
  };
  await db.imports.create(initialJob);

  const parser = parsers.find((p) => p.supports(file));
  if (!parser) {
    await db.imports.update(jobId, { status: "failed", errors: 1 });
    throw new Error(`No parser supports file: ${file.name}`);
  }

  try {
    await db.imports.update(jobId, { status: "processing" });

    const parsed = await parser.parse(file);

    // Use reviewed items (user-confirmed categories) if provided, otherwise auto-categorize
    const itemsToImport = reviewedItems
      ? reviewedItems
      : parsed.items.map((item) => ({
          item,
          categoryId: autoCategorize(item.description),
        }));

    const statement: Statement = {
      id: crypto.randomUUID(),
      cardId,
      reference: parsed.reference,
      closingDate: parsed.closingDate,
      dueDate: parsed.dueDate,
      total: parsed.total,
      minimum: Math.round(parsed.total * 0.15 * 100) / 100,
      itemsCount: itemsToImport.length,
      status: "pendente",
    };
    await db.statements.create(statement);

    const transactions: Transaction[] = itemsToImport.map(({ item, categoryId }) => ({
      id: crypto.randomUUID(),
      date: item.date,
      merchant: item.merchant,
      description: item.description,
      amount: item.amount,
      categoryId,
      cardId,
      statementId: statement.id,
      origin: "fatura" as const,
      installment: item.installment,
      status: "pendente" as const,
    }));
    await db.transactions.bulkCreate(transactions);

    await db.imports.update(jobId, {
      status: "reviewed",
      items: transactions.length,
      statementId: statement.id,
    });

    const finalJob = await db.imports.get(jobId);
    return finalJob!;
  } catch (err) {
    await db.imports.update(jobId, { status: "failed", errors: 1 });
    throw err;
  }
}

function detectOrigin(cardId: string): string {
  if (cardId.toLowerCase().includes("santander")) return "Santander";
  if (cardId.toLowerCase().includes("nubank")) return "Nubank";
  return "Desconhecido";
}
