'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useThemeComponents } from '@hearthos/theme-sdk';
import type { Message, Thread, StaffAgent } from '@hearthos/core';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const { Layout, MessageDisplay, InputArea } = useThemeComponents();

  const [thread, setThread] = useState<(Thread & { agent?: StaffAgent }) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/threads/${threadId}`);
      setThread(await res.json());
    } catch { /* offline */ }
  }, [threadId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/threads/${threadId}/messages`);
      setMessages(await res.json());
    } catch { /* offline */ }
  }, [threadId]);

  useEffect(() => {
    fetchThread();
    fetchMessages();
  }, [fetchThread, fetchMessages]);

  const agentName = thread?.agent?.name;

  const handleSend = async (content: string) => {
    setSending(true);
    const tempMsg: Message = {
      id: `temp-${Date.now()}`, threadId, role: 'user', content, createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`${API}/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const { userMessage, assistantMessage } = await res.json();
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempMsg.id),
        userMessage,
        assistantMessage,
      ]);
    } catch {
      setMessages(prev => [...prev, {
        id: `fallback-${Date.now()}`, threadId, role: 'assistant' as const,
        content: 'Server is offline. Your message was saved locally.', createdAt: new Date(),
      }]);
    }
    setSending(false);
  };

  return (
    <Layout title={thread?.title ?? 'Loading...'}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.map(msg => (
            <MessageDisplay
              key={msg.id}
              message={msg}
              isOwn={msg.role === 'user'}
              agentName={msg.role === 'assistant' ? agentName : undefined}
            />
          ))}
        </div>
        <InputArea onSend={handleSend} disabled={sending} />
      </div>
    </Layout>
  );
}
