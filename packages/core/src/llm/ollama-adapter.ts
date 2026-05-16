import { LLMAdapter } from '../types';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: false;
}

interface OllamaChatResponse {
  message: OllamaMessage;
  done: boolean;
}

export interface OllamaAdapterOptions {
  model?: string;
  baseUrl?: string;
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a family-learning assistant running on the HearthOS platform. Your role is to help family members (especially children) with learning, growth, and daily activities.

Guidelines:
- Be warm, sincere, and encouraging
- Use age-appropriate, accessible language
- Give concrete, actionable advice
- Support children's curiosity
- Create a safe, supportive environment
- Keep responses short and focused; avoid unnecessary length`;

export class OllamaAdapter implements LLMAdapter {
  private model: string;
  private baseUrl: string;
  private systemPrompt: string;

  constructor(options: OllamaAdapterOptions = {}) {
    this.model = options.model ?? 'llama3.1';
    this.baseUrl = options.baseUrl ?? 'http://localhost:11434';
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  async complete(prompt: string, context?: Record<string, unknown>): Promise<string> {
    const messages: OllamaMessage[] = [];

    // Build system prompt with agent context if available
    let system = this.systemPrompt;
    if (context?.agentName) {
      system += `\n\nYour name is ${context.agentName}. Your role: ${context.agentRole ?? 'assistant'}.`;
      if (context.agentSpecialties) {
        system += ` Your specialties: ${context.agentSpecialties}.`;
      }
    }

    // Include agent contract (purpose, never-rules, proof obligations)
    if (context?.agentPurpose) {
      system += `\n\nYour purpose: ${context.agentPurpose}`;
    }
    if (context?.agentNeverRules) {
      system += `\n\nThings you must never do:\n${context.agentNeverRules}`;
    }
    if (context?.agentStage) {
      const stageLabel = context.agentStage === 'back-stage' ? 'back-stage (behind the scenes)' : 'front-stage (direct interaction)';
      system += `\n\nYou are a ${stageLabel} agent.`;
      if (context.agentStage === 'back-stage') {
        system += ' You do not communicate directly with children; you only review the outputs of other agents.';
      }
    }
    if (context?.agentTier) {
      const tierDescriptions: Record<string, string> = {
        'READ': 'You have READ permission only — provide information but do not propose changes.',
        'PROPOSE': 'You have READ and PROPOSE permissions — you may provide information and propose changes, but do not execute.',
        'EXECUTE': 'You have READ, PROPOSE, and EXECUTE permissions.',
      };
      system += `\n\nPermission tier: ${tierDescriptions[String(context.agentTier)] ?? context.agentTier}`;
    }

    if (context?.memberName) {
      system += `\n\nYou are speaking with: ${context.memberName}${context.memberAge ? ` (${context.memberAge} years old)` : ''}.`;
    }
    if (context?.assignmentInstructions) {
      system += `\n\nSpecific instructions for this learner: ${context.assignmentInstructions}`;
    }
    if (context?.familyRules) {
      system += `\n\nFamily rules: ${context.familyRules}`;
    }
    if (context?.familyPreferences) {
      system += `\n\nFamily preferences: ${context.familyPreferences}`;
    }
    messages.push({ role: 'system', content: system });

    // Add conversation history if provided
    if (context?.history && typeof context.history === 'string') {
      const lines = context.history.split('\n');
      for (const line of lines) {
        const match = line.match(/^(user|assistant|system):\s*(.+)$/);
        if (match) {
          messages.push({
            role: match[1] as OllamaMessage['role'],
            content: match[2],
          });
        }
      }
    }

    // Add current user message (only if not already in history)
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== prompt) {
      messages.push({ role: 'user', content: prompt });
    }

    const body: OllamaChatRequest = {
      model: this.model,
      messages,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message.content;
  }
}
