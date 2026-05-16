import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPortfolio } from '../src/memory/portfolio';

describe('MemoryPortfolio', () => {
  let portfolio: MemoryPortfolio;

  beforeEach(() => {
    portfolio = new MemoryPortfolio();
  });

  describe('add', () => {
    it('assigns sequential ids', () => {
      const a = portfolio.add({ memberId: 'm1', category: 'note', content: 'first', tags: [] });
      const b = portfolio.add({ memberId: 'm1', category: 'note', content: 'second', tags: [] });
      expect(a.id).toBe('mem-1');
      expect(b.id).toBe('mem-2');
    });

    it('attaches a captured-at timestamp', () => {
      const entry = portfolio.add({ memberId: 'm1', category: 'preference', content: 'likes math', tags: [] });
      expect(entry.capturedAt).toBeInstanceOf(Date);
    });

    it('preserves provided fields', () => {
      const entry = portfolio.add({
        memberId: 'member-lily',
        category: 'milestone',
        content: 'Finished reading first chapter',
        tags: ['reading', 'achievement'],
      });
      expect(entry.memberId).toBe('member-lily');
      expect(entry.category).toBe('milestone');
      expect(entry.content).toBe('Finished reading first chapter');
      expect(entry.tags).toEqual(['reading', 'achievement']);
    });
  });

  describe('getByMember', () => {
    beforeEach(() => {
      portfolio.add({ memberId: 'lily', category: 'note', content: 'A', tags: [] });
      portfolio.add({ memberId: 'lily', category: 'note', content: 'B', tags: [] });
      portfolio.add({ memberId: 'max', category: 'note', content: 'C', tags: [] });
    });

    it('returns only the requested member entries', () => {
      expect(portfolio.getByMember('lily')).toHaveLength(2);
      expect(portfolio.getByMember('max')).toHaveLength(1);
    });

    it('returns empty for an unknown member', () => {
      expect(portfolio.getByMember('nobody')).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      portfolio.add({
        memberId: 'lily',
        category: 'preference',
        content: 'Lily loves space and dinosaurs',
        tags: ['interest'],
      });
      portfolio.add({
        memberId: 'lily',
        category: 'milestone',
        content: 'Read first chapter book',
        tags: ['reading'],
      });
      portfolio.add({
        memberId: 'max',
        category: 'preference',
        content: 'Max loves chess',
        tags: ['interest'],
      });
    });

    it('finds entries by content match (case-insensitive)', () => {
      const found = portfolio.search('lily', 'SPACE');
      expect(found).toHaveLength(1);
      expect(found[0].content).toContain('space');
    });

    it('finds entries by tag match (case-insensitive)', () => {
      const found = portfolio.search('lily', 'READING');
      expect(found).toHaveLength(1);
      expect(found[0].tags).toContain('reading');
    });

    it('finds entries by category match (case-insensitive)', () => {
      const found = portfolio.search('lily', 'milestone');
      expect(found).toHaveLength(1);
    });

    it('scopes results to the requested member', () => {
      const found = portfolio.search('lily', 'chess');
      expect(found).toHaveLength(0);
      const maxResults = portfolio.search('max', 'chess');
      expect(maxResults).toHaveLength(1);
    });

    it('returns empty when no match', () => {
      expect(portfolio.search('lily', 'unicorns')).toHaveLength(0);
    });
  });

  describe('getAll + clear', () => {
    it('getAll returns a copy', () => {
      portfolio.add({ memberId: 'x', category: 'note', content: 'a', tags: [] });
      const all = portfolio.getAll();
      const before = all.length;
      all.push({
        id: 'fake',
        memberId: 'x',
        category: 'note',
        content: 'leak',
        tags: [],
        capturedAt: new Date(),
      });
      expect(portfolio.getAll().length).toBe(before);
    });

    it('clear drops all entries and resets the id counter', () => {
      portfolio.add({ memberId: 'x', category: 'note', content: 'a', tags: [] });
      portfolio.add({ memberId: 'x', category: 'note', content: 'b', tags: [] });
      portfolio.clear();
      expect(portfolio.getAll()).toHaveLength(0);
      const fresh = portfolio.add({ memberId: 'x', category: 'note', content: 'c', tags: [] });
      expect(fresh.id).toBe('mem-1');
    });
  });
});
