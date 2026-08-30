import { getDatabase, type DatabaseTransaction } from "./client";

export async function inTransaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
  return getDatabase().transaction(work);
}
