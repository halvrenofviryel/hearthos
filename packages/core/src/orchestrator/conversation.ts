import { Message, Thread, LLMAdapter } from '../types';
import { PolicyEngine } from '../policy/engine';
import { AuditLogger } from '../audit/logger';
import { MemoryPortfolio } from '../memory/portfolio';

export class ConversationOrchestrator {
  private threads: Map<string, Thread> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private nextMsgId = 1;
  private nextThreadId = 1;

  constructor(
    private policyEngine: PolicyEngine,
    private auditLogger: AuditLogger,
    private memoryPortfolio: MemoryPortfolio,
    private llmAdapter: LLMAdapter,
  ) {}

  createThread(familyId: string, memberId: string, agentId: string, title: string): Thread {
    const thread: Thread = {
      id: `thread-${this.nextThreadId++}`,
      familyId,
      memberId,
      agentId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.threads.set(thread.id, thread);
    this.messages.set(thread.id, []);

    this.auditLogger.log({
      actor: memberId,
      action: 'CREATE_THREAD',
      resource: `thread:${thread.id}`,
      details: { title, agentId },
    });

    return thread;
  }

  async processMessage(
    threadId: string,
    content: string,
    actor: { id: string; role: string },
  ): Promise<Message> {
    const thread = this.threads.get(threadId);
    if (!thread) throw new Error(`Thread ${threadId} not found`);

    const readCheck = this.policyEngine.evaluate({
      action: 'READ',
      resource: `thread:${threadId}`,
      actor,
      target: { id: thread.memberId, role: 'member' },
    });

    if (!readCheck.allowed) {
      throw new Error(`Access denied: ${readCheck.reason}`);
    }

    const userMessage: Message = {
      id: `msg-${this.nextMsgId++}`,
      threadId,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    this.messages.get(threadId)!.push(userMessage);

    const threadMessages = this.messages.get(threadId)!;
    const historyContext = threadMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    const response = await this.llmAdapter.complete(content, { threadId, history: historyContext });

    const assistantMessage: Message = {
      id: `msg-${this.nextMsgId++}`,
      threadId,
      role: 'assistant',
      content: response,
      createdAt: new Date(),
    };
    this.messages.get(threadId)!.push(assistantMessage);

    this.auditLogger.log({
      actor: actor.id,
      action: 'SEND_MESSAGE',
      resource: `thread:${threadId}`,
      details: { messageId: userMessage.id, responseId: assistantMessage.id },
    });

    if (content.length > 50) {
      this.memoryPortfolio.add({
        memberId: thread.memberId,
        category: 'conversation',
        content: `[${thread.title}] ${content}`,
        tags: ['auto-captured', 'conversation'],
      });
    }

    thread.updatedAt = new Date();
    return assistantMessage;
  }

  getThread(threadId: string): Thread | undefined {
    return this.threads.get(threadId);
  }

  getThreads(familyId?: string): Thread[] {
    const all = Array.from(this.threads.values());
    if (familyId) return all.filter(t => t.familyId === familyId);
    return all;
  }

  getMessages(threadId: string): Message[] {
    return this.messages.get(threadId) || [];
  }
}
