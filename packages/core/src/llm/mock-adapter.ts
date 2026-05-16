import { LLMAdapter } from '../types';

const RESPONSE_POOL: Record<string, string[]> = {
  greeting: [
    "Hi there! How are you doing today? I'm here to help with anything you need.",
    "Hello! Great to see you. What would you like to work on today?",
    "Hey! I'm ready to help. What's on your mind?",
  ],
  question: [
    "That's a great question! Let me think about the best way to explain this. The key idea is to break it down into smaller parts and tackle each one step by step.",
    "I'd love to help you understand this better. The most important thing to remember is that learning is a journey, and every question brings you closer to mastery.",
    "Good question! Let me break this down for you. Think of it like building blocks — each concept supports the next one.",
  ],
  plan: [
    "I think we could create a really good plan for this. First, let's identify your main goals, then we'll map out weekly milestones to keep you on track.",
    "Here's what I'd suggest for your learning plan: start with the fundamentals, build consistent practice habits, and we'll check in regularly to adjust as needed.",
    "Let me put together a structured approach for you. We'll balance challenge with achievability so you stay motivated throughout.",
  ],
  encouragement: [
    "You're doing great! Keep up the amazing work. Every bit of effort you put in is building something wonderful.",
    "I can see you're making real progress. That's wonderful! Remember, consistency is what turns good effort into great results.",
    "Fantastic effort! Every step forward counts. I'm really proud of how you're approaching this.",
  ],
  default: [
    "I understand. Let me help you with that. We can work through this together and find the best approach.",
    "That makes sense. Here's what I'd suggest — let's take it one step at a time and build from there.",
    "Thanks for sharing that. Let me think about the best approach. I want to make sure we find something that works well for you.",
  ],
};

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function categorize(input: string): string {
  const lower = input.toLowerCase();
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(lower)) return 'greeting';
  if (/\?$/.test(lower.trim()) || /^(what|why|how|when|where|who|can|do|is|are|will)/.test(lower)) return 'question';
  if (/plan|schedule|course|learn|study|goal/.test(lower)) return 'plan';
  if (/great|good|well|progress|done|finished|completed/.test(lower)) return 'encouragement';
  return 'default';
}

export class MockLLMAdapter implements LLMAdapter {
  async complete(prompt: string, _context?: Record<string, unknown>): Promise<string> {
    const category = categorize(prompt);
    const pool = RESPONSE_POOL[category] ?? RESPONSE_POOL['default'];
    const index = simpleHash(prompt) % pool.length;
    return pool[index];
  }
}
