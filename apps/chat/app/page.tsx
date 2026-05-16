'use client';

import { useState, useEffect, useCallback } from 'react';
import { useThemeComponents, useEventBus } from '@hearthos/theme-sdk';
import type { Thread, Message, StaffAgent } from '@hearthos/core';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ChatPage() {
  const { Layout, ThreadList, MessageDisplay, InputArea } = useThemeComponents();
  const eventBus = useEventBus();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState<StaffAgent[]>([]);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/agents?stage=front-stage`)
      .then(r => r.json())
      .then(setAgents)
      .catch(() => {});
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/threads?familyId=family-1`);
      const data = await res.json();
      setThreads(data);
    } catch {
      setThreads([]);
    }
  }, []);

  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`${API}/api/threads/${threadId}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (activeThreadId) fetchMessages(activeThreadId);
  }, [activeThreadId, fetchMessages]);

  const handleNewThread = () => {
    setShowAgentPicker(true);
  };

  const createThread = async (agentId: string) => {
    setShowAgentPicker(false);
    try {
      const res = await fetch(`${API}/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: 'family-1',
          memberId: 'member-lily',
          agentId,
          title: `Chat ${new Date().toLocaleDateString()}`,
        }),
      });
      const thread = await res.json();
      eventBus.emit('thread:created', { threadId: thread.id, title: thread.title });
      setThreads(prev => [thread, ...prev]);
      setActiveThreadId(thread.id);
      setMessages([]);
    } catch {
      const id = `thread-local-${Date.now()}`;
      const thread: Thread = {
        id, familyId: 'family-1', memberId: 'member-lily',
        agentId, title: `Chat ${new Date().toLocaleDateString()}`,
        createdAt: new Date(), updatedAt: new Date(),
      };
      setThreads(prev => [thread, ...prev]);
      setActiveThreadId(id);
      setMessages([]);
    }
  };

  const handleSend = async (content: string) => {
    if (!activeThreadId) return;
    setSending(true);

    const userMsg: Message = {
      id: `local-${Date.now()}`, threadId: activeThreadId,
      role: 'user', content, createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`${API}/api/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const { userMessage, assistantMessage } = await res.json();
      setMessages(prev => [
        ...prev.filter(m => m.id !== userMsg.id),
        userMessage,
        assistantMessage,
      ]);
      eventBus.emit('message:sent', { threadId: activeThreadId, message: userMessage });
      eventBus.emit('message:received', { threadId: activeThreadId, message: assistantMessage });
    } catch {
      const fallback: Message = {
        id: `local-resp-${Date.now()}`, threadId: activeThreadId,
        role: 'assistant',
        content: "I'm here to help! It looks like the server is offline, but I'm still with you.",
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, fallback]);
    }
    setSending(false);
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const activeAgent = activeThread ? agents.find(a => a.id === activeThread.agentId) : undefined;

  return (
    <Layout
      title="HearthOS Chat"
      sidebar={
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId ?? undefined}
          onSelectThread={setActiveThreadId}
          onNewThread={handleNewThread}
          agents={agents}
        />
      }
    >
      {showAgentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAgentPicker(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Choose an agent</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              <span className="inline-block mr-1" aria-hidden>🛡️</span>
              Each agent <em>proposes</em>; nothing is executed without parent approval. The
              bounded-authority discipline lives in <code className="text-[10px] bg-slate-100 px-1 rounded">@hearthos/core</code> &mdash; agents cannot bypass it.
            </p>
            <div className="space-y-2">
              {agents.map(agent => {
                const a = agent as unknown as { uiLabel?: string; contract?: { purpose?: string } };
                const displayLabel = a.uiLabel ?? agent.name;
                const purpose = a.contract?.purpose ?? '';
                return (
                  <button
                    key={agent.id}
                    onClick={() => createThread(agent.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{displayLabel}</span>
                      {a.uiLabel && a.uiLabel !== agent.name && (
                        <span className="text-[11px] text-slate-400 font-mono">{agent.name}</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5 leading-snug">
                      {purpose || `${agent.role} — ${agent.specialties.join(', ')}`}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAgentPicker(false)}
              className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeThreadId ? (
        <div className="flex flex-col h-full">
          {activeAgent && (
            <div className="px-6 py-2.5 border-b border-violet-200 bg-white/60 backdrop-blur-sm flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500">Talking to</span>
              <span className="font-semibold text-violet-700">
                {(activeAgent as unknown as { uiLabel?: string }).uiLabel ?? activeAgent.name}
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                <span aria-hidden>🛡️</span>
                Suggestion mode · parent executes
              </span>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.map(msg => (
              <MessageDisplay
                key={msg.id}
                message={msg}
                isOwn={msg.role === 'user'}
                agentName={
                  msg.role === 'assistant'
                    ? (activeAgent as unknown as { uiLabel?: string } | undefined)?.uiLabel ?? activeAgent?.name
                    : undefined
                }
              />
            ))}
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center max-w-md px-4">
                  <p className="text-sm mb-2">Start the conversation by sending a message below.</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The agent will <em>propose</em> a response. In a real deployment, anything
                    high-stakes (subscriptions, sharing, schedule changes) would wait for explicit
                    parent approval before executing.
                  </p>
                </div>
              </div>
            )}
            {sending && (
              <div className="flex justify-start mb-4">
                <div className="rounded-2xl px-4 py-3 bg-white border border-violet-200 text-gray-500">
                  <p className="text-sm">
                    <span className="inline-block animate-pulse">●</span>{' '}
                    <span className="inline-block animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>{' '}
                    <span className="inline-block animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>{' '}
                    <span className="ml-1 text-xs">Composing a suggestion…</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <InputArea onSend={handleSend} disabled={sending} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent mb-3">
              Welcome to HearthOS
            </h2>
            <p className="text-gray-600 mb-2 leading-relaxed">
              A bounded-authority chat surface. Pick an agent on the left to start a conversation —
              the agent will <em>propose</em>, never execute on its own.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are speaking as a member of the seeded Hearth Family. The chat is wired to the
              local API at <code className="text-[10px] bg-slate-100 px-1 rounded">{API}</code>.
              For the family-facing demo (no API, no DB), open{' '}
              <a
                href="http://localhost:3300"
                target="_blank"
                rel="noopener"
                className="text-violet-600 hover:text-violet-800 underline"
              >
                localhost:3300
              </a>.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}
