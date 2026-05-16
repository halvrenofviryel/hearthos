import type { Message, Plan, MemoryEntry, CoursePlan } from '@hearthos/core';

export interface ThemeEventMap {
  'message:sent': { threadId: string; message: Message };
  'message:received': { threadId: string; message: Message };
  'plan:created': { plan: Plan };
  'plan:approved': { planId: string };
  'plan:rejected': { planId: string };
  'memory:captured': { entry: MemoryEntry };
  'course:enrolled': { plan: CoursePlan };
  'thread:created': { threadId: string; title: string };
}

export type ThemeEventHandler<K extends keyof ThemeEventMap> = (data: ThemeEventMap[K]) => void;

export class ThemeEventBus {
  private handlers: Map<string, Set<Function>> = new Map();

  on<K extends keyof ThemeEventMap>(event: K, handler: ThemeEventHandler<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit<K extends keyof ThemeEventMap>(event: K, data: ThemeEventMap[K]): void {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }

  clear(): void {
    this.handlers.clear();
  }
}
