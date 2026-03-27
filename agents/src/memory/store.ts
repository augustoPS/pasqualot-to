import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MemoryEntry, MemoryStore } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORIES_DIR = path.resolve(__dirname, '../../memories');

function memoryPath(agentName?: string): string {
  const file = agentName ? `${agentName}.json` : 'shared.json';
  return path.join(MEMORIES_DIR, file);
}

function read(agentName?: string): MemoryStore {
  const filePath = memoryPath(agentName);
  if (!fs.existsSync(filePath)) return { entries: [] };
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MemoryStore;
}

function write(store: MemoryStore, agentName?: string): void {
  fs.writeFileSync(memoryPath(agentName), JSON.stringify(store, null, 2));
}

export function readMemory(agentName?: string): MemoryEntry[] {
  return read(agentName).entries;
}

export function writeMemory(entry: Omit<MemoryEntry, 'timestamp'>, agentName?: string): void {
  const store = read(agentName);
  const existing = store.entries.findIndex(e => e.key === entry.key);
  const full: MemoryEntry = { ...entry, timestamp: new Date().toISOString() };
  if (existing >= 0) {
    store.entries[existing] = full;
  } else {
    store.entries.push(full);
  }
  write(store, agentName);
}

export function deleteMemory(key: string, agentName?: string): void {
  const store = read(agentName);
  store.entries = store.entries.filter(e => e.key !== key);
  write(store, agentName);
}

export function searchMemory(query: string, agentName?: string): MemoryEntry[] {
  const q = query.toLowerCase();
  return read(agentName).entries.filter(
    e =>
      e.key.toLowerCase().includes(q) ||
      e.value.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
  );
}

export function formatMemoriesForPrompt(entries: MemoryEntry[]): string {
  if (entries.length === 0) return '(none)';
  return entries.map(e => `[${e.key}]: ${e.value}`).join('\n');
}
