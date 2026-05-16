import { MemoryEntry } from '../types';

export class MemoryPortfolio {
  private entries: MemoryEntry[] = [];
  private nextId = 1;

  add(entry: Omit<MemoryEntry, 'id' | 'capturedAt'>): MemoryEntry {
    const newEntry: MemoryEntry = {
      ...entry,
      id: `mem-${this.nextId++}`,
      capturedAt: new Date(),
    };
    this.entries.push(newEntry);
    return newEntry;
  }

  getByMember(memberId: string): MemoryEntry[] {
    return this.entries.filter(e => e.memberId === memberId);
  }

  search(memberId: string, query: string): MemoryEntry[] {
    const lower = query.toLowerCase();
    return this.entries.filter(
      e =>
        e.memberId === memberId &&
        (e.content.toLowerCase().includes(lower) ||
          e.tags.some(t => t.toLowerCase().includes(lower)) ||
          e.category.toLowerCase().includes(lower)),
    );
  }

  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.nextId = 1;
  }
}
