// The store notebook — terse lessons the assistant distills from its own
// sessions ("attribute keys are slugified names", "the owner prices helmets
// himself"). It's injected into every run's system prompt, so experience
// carries across conversations AND across model switches: a newly selected
// model starts with everything its predecessors learned.

import { getSetting, setSetting } from "@/lib/settings";

export const NOTES_SETTING = "assistant.notes";
export const MAX_NOTES = 40;
export const MAX_NOTE_LENGTH = 300;

export type StoreNote = { note: string; at: string };

export function normalizeNote(note: string): string {
  return note.toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatNotebook(notes: StoreNote[]): string {
  if (notes.length === 0) return "(empty — nothing recorded yet)";
  return notes.map((n) => `- [${n.at}] ${n.note}`).join("\n");
}

export async function readNotes(): Promise<StoreNote[]> {
  const raw = await getSetting(NOTES_SETTING);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is StoreNote =>
        typeof n === "object" && n !== null && typeof (n as StoreNote).note === "string"
    );
  } catch {
    return [];
  }
}

// Oldest notes fall off past the cap; exact re-learnings are dropped.
export async function addNote(note: string): Promise<{ added: boolean; count: number }> {
  const notes = await readNotes();
  const normalized = normalizeNote(note);
  if (notes.some((n) => normalizeNote(n.note) === normalized)) {
    return { added: false, count: notes.length };
  }
  notes.push({ note, at: new Date().toISOString().slice(0, 10) });
  const kept = notes.slice(-MAX_NOTES);
  await setSetting(NOTES_SETTING, JSON.stringify(kept));
  return { added: true, count: kept.length };
}
