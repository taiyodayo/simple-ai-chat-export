import { ExportError, conversationLocation } from "./core.js";

// Deliberately fail closed until the live investigation establishes the data
// source, visible branch identity, pagination and completeness evidence.
// A DOM snapshot or guessed private endpoint is not a complete export.
export async function retrieveCurrentConversation(tab, { signal } = {}) {
  signal?.throwIfAborted();
  conversationLocation(tab?.url);
  throw new ExportError("verification-pending");
}
