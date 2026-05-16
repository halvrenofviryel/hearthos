import { AuditEntry } from '../types';

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private nextId = 1;

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const newEntry: AuditEntry = {
      ...entry,
      id: `audit-${this.nextId++}`,
      timestamp: new Date(),
    };
    this.entries.push(newEntry);
    return newEntry;
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  getByActor(actorId: string): AuditEntry[] {
    return this.entries.filter(e => e.actor === actorId);
  }

  getByResource(resource: string): AuditEntry[] {
    return this.entries.filter(e => e.resource === resource);
  }

  getRecent(count: number): AuditEntry[] {
    if (count <= 0) return [];
    return this.entries.slice(-count);
  }

  clear(): void {
    this.entries = [];
    this.nextId = 1;
  }
}
