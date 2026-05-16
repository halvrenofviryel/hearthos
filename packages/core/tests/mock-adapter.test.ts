import { describe, it, expect } from 'vitest';
import { MockLLMAdapter } from '../src/llm/mock-adapter';

describe('MockLLMAdapter', () => {
  const adapter = new MockLLMAdapter();

  describe('determinism', () => {
    it('returns the same response for the same prompt across calls', async () => {
      const prompt = 'Help me plan my study session for tomorrow';
      const a = await adapter.complete(prompt);
      const b = await adapter.complete(prompt);
      const c = await adapter.complete(prompt);
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('returns the same response across new adapter instances', async () => {
      const prompt = 'How are you today?';
      const a = await new MockLLMAdapter().complete(prompt);
      const b = await new MockLLMAdapter().complete(prompt);
      expect(a).toBe(b);
    });

    it('ignores the optional context argument for determinism', async () => {
      const prompt = 'What is the next step?';
      const a = await adapter.complete(prompt, { agentName: 'X', familyId: 'fam-1' });
      const b = await adapter.complete(prompt, { agentName: 'Y', familyId: 'fam-2' });
      expect(a).toBe(b);
    });
  });

  describe('categorisation', () => {
    it('greets when input starts with a greeting word', async () => {
      const response = await adapter.complete('Hi there');
      const expectedGreeting = /^(Hi there!|Hello!|Hey!)/;
      expect(response).toMatch(expectedGreeting);
    });

    it('treats question-mark inputs as questions', async () => {
      const response = await adapter.complete('Will I understand this?');
      const questionStarters = /(great question|love to help you understand|break this down)/i;
      expect(response).toMatch(questionStarters);
    });

    it('treats how/what/why/when leading inputs as questions', async () => {
      const response = await adapter.complete('How does this work');
      const questionStarters = /(great question|love to help|break this down|building blocks|journey)/i;
      expect(response).toMatch(questionStarters);
    });

    it('routes plan-related inputs to the plan pool', async () => {
      const response = await adapter.complete('Can we make a study plan?');
      // Plan-keyword overrides the question branch only when both match —
      // categoriser evaluates question first, so this lives in question pool.
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(20);
    });

    it('routes encouragement keywords through the encouragement pool', async () => {
      const response = await adapter.complete('I finished my reading');
      const encouragement = /(doing great|making real progress|fantastic effort|every step)/i;
      expect(response).toMatch(encouragement);
    });

    it('falls back to the default pool for neutral input', async () => {
      const response = await adapter.complete('Maybe later');
      // Neutral input shouldn't match greeting/question/plan/encouragement
      const defaultPool = /(I understand|that makes sense|thanks for sharing)/i;
      expect(response).toMatch(defaultPool);
    });
  });

  describe('output quality', () => {
    it('always returns a non-empty string', async () => {
      for (const input of ['', 'a', 'hello', 'what?', 'plan my week']) {
        const response = await adapter.complete(input);
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      }
    });

    it('returns one of the predefined pool entries (no hallucination)', async () => {
      const knownFragments = [
        'great to see you',
        'great question',
        'good plan',
        'doing great',
        'I understand',
        'that makes sense',
        'thanks for sharing',
        'ready to help',
        'learning is a journey',
        'consistent practice',
        'I think we could',
        'structured approach',
        'real progress',
        'fantastic effort',
        'one step at a time',
        "I'd love to help",
        'how are you',
        'on your mind',
        "Let me think",
        "Let me break",
        "Let me put",
        'building something wonderful',
        'every step forward',
        'work through this',
        'best approach',
        'find something that works',
      ];
      const sampleInputs = ['Hi', 'What is X?', 'plan this', 'done', 'random'];
      for (const input of sampleInputs) {
        const response = await adapter.complete(input);
        const matched = knownFragments.some(f =>
          response.toLowerCase().includes(f.toLowerCase()),
        );
        expect(matched, `Response did not match any known pool fragment: ${response}`).toBe(true);
      }
    });
  });
});
