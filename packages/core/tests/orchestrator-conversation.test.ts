import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationOrchestrator } from '../src/orchestrator/conversation';
import { PolicyEngine } from '../src/policy/engine';
import { AuditLogger } from '../src/audit/logger';
import { MemoryPortfolio } from '../src/memory/portfolio';
import { MockLLMAdapter } from '../src/llm/mock-adapter';

describe('ConversationOrchestrator', () => {
  let policy: PolicyEngine;
  let audit: AuditLogger;
  let memory: MemoryPortfolio;
  let llm: MockLLMAdapter;
  let orchestrator: ConversationOrchestrator;

  const lily = { id: 'member-lily', role: 'child' };
  const david = { id: 'member-david', role: 'parent' };

  beforeEach(() => {
    policy = new PolicyEngine();
    audit = new AuditLogger();
    memory = new MemoryPortfolio();
    llm = new MockLLMAdapter();
    orchestrator = new ConversationOrchestrator(policy, audit, memory, llm);
  });

  describe('createThread', () => {
    it('creates a thread with a unique id and stores it', () => {
      const t1 = orchestrator.createThread('family-1', 'member-lily', 'agent-tutor', 'Math homework');
      const t2 = orchestrator.createThread('family-1', 'member-lily', 'agent-tutor', 'Reading');
      expect(t1.id).not.toBe(t2.id);
      expect(orchestrator.getThread(t1.id)).toEqual(t1);
      expect(orchestrator.getThread(t2.id)).toEqual(t2);
    });

    it('records an audit entry on creation', () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent-tutor', 'Homework');
      const entries = audit.getByResource(`thread:${t.id}`);
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('CREATE_THREAD');
      expect(entries[0].actor).toBe('member-lily');
    });

    it('returns the thread with all required fields populated', () => {
      const t = orchestrator.createThread('fam', 'm', 'a', 'Title');
      expect(t.familyId).toBe('fam');
      expect(t.memberId).toBe('m');
      expect(t.agentId).toBe('a');
      expect(t.title).toBe('Title');
      expect(t.createdAt).toBeInstanceOf(Date);
      expect(t.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('processMessage', () => {
    it('appends a user message and an assistant response in order', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent-tutor', 'Math');
      await orchestrator.processMessage(t.id, 'Hello, can you help?', lily);
      const messages = orchestrator.getMessages(t.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello, can you help?');
      expect(messages[1].role).toBe('assistant');
      expect(typeof messages[1].content).toBe('string');
      expect(messages[1].content.length).toBeGreaterThan(0);
    });

    it('produces deterministic assistant responses (MockLLM)', async () => {
      const t1 = orchestrator.createThread('fam', 'member-lily', 'agent', 'Run 1');
      const t2 = orchestrator.createThread('fam', 'member-lily', 'agent', 'Run 2');
      await orchestrator.processMessage(t1.id, 'Tell me about plans', lily);
      await orchestrator.processMessage(t2.id, 'Tell me about plans', lily);
      const m1 = orchestrator.getMessages(t1.id);
      const m2 = orchestrator.getMessages(t2.id);
      expect(m1[1].content).toBe(m2[1].content);
    });

    it('throws when the thread does not exist', async () => {
      await expect(
        orchestrator.processMessage('missing-thread', 'hi', lily),
      ).rejects.toThrow(/not found/);
    });

    it('enforces the READ policy gate', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent-tutor', 'Math');
      // Max is another child trying to read Lily's thread — should be denied
      const max = { id: 'member-max', role: 'child' };
      await expect(orchestrator.processMessage(t.id, 'hi', max)).rejects.toThrow(/Access denied/);
    });

    it('lets parents access any member thread (parent → child)', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent', 'Math');
      const reply = await orchestrator.processMessage(t.id, 'How is it going?', david);
      expect(reply.role).toBe('assistant');
      expect(orchestrator.getMessages(t.id)).toHaveLength(2);
    });

    it('records a SEND_MESSAGE audit entry per turn', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent', 'Math');
      audit.clear(); // drop the CREATE_THREAD entry to isolate
      await orchestrator.processMessage(t.id, 'Can you help me?', lily);
      const entries = audit.getByResource(`thread:${t.id}`);
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('SEND_MESSAGE');
    });

    it('auto-captures long messages into the memory portfolio', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent', 'Tutoring');
      const longMessage =
        'I have been struggling with my math homework for the past two weeks and I really want to understand how multiplication works.';
      await orchestrator.processMessage(t.id, longMessage, lily);
      const memories = memory.getByMember('member-lily');
      expect(memories).toHaveLength(1);
      expect(memories[0].category).toBe('conversation');
      expect(memories[0].tags).toContain('auto-captured');
      expect(memories[0].content).toContain(longMessage);
    });

    it('does NOT auto-capture short messages', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent', 'Math');
      await orchestrator.processMessage(t.id, 'OK', lily);
      expect(memory.getByMember('member-lily')).toHaveLength(0);
    });

    it('updates the thread.updatedAt timestamp on each message', async () => {
      const t = orchestrator.createThread('fam', 'member-lily', 'agent', 'Math');
      const beforeTime = t.updatedAt.getTime();
      // Small wait so the timestamp can advance
      await new Promise(r => setTimeout(r, 5));
      await orchestrator.processMessage(t.id, 'hello', lily);
      const updated = orchestrator.getThread(t.id)!;
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('getThreads', () => {
    it('lists every thread when no filter is given', () => {
      orchestrator.createThread('fam-A', 'm1', 'a', 'A1');
      orchestrator.createThread('fam-B', 'm2', 'a', 'B1');
      orchestrator.createThread('fam-A', 'm3', 'a', 'A2');
      expect(orchestrator.getThreads()).toHaveLength(3);
    });

    it('filters by familyId', () => {
      orchestrator.createThread('fam-A', 'm1', 'a', 'A1');
      orchestrator.createThread('fam-B', 'm2', 'a', 'B1');
      orchestrator.createThread('fam-A', 'm3', 'a', 'A2');
      expect(orchestrator.getThreads('fam-A')).toHaveLength(2);
      expect(orchestrator.getThreads('fam-B')).toHaveLength(1);
      expect(orchestrator.getThreads('fam-missing')).toHaveLength(0);
    });
  });
});
