'use client';

import React, { useState } from 'react';
import type { ThemeContract } from '../contract';
import type {
  LayoutProps, MessageDisplayProps, InputAreaProps,
  ThreadListProps, PlanViewProps, CoursePlanViewProps,
  MemoryViewProps, MemberCardProps,
} from '../contract';

function VividLayout({ children, sidebar, title }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-violet-50 to-pink-50">
      {sidebar && (
        <aside className="w-80 border-r border-violet-200 bg-white/80 backdrop-blur-sm overflow-y-auto">
          {sidebar}
        </aside>
      )}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-violet-200 bg-white/80 backdrop-blur-sm flex items-center px-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            {title}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

function VividMessageDisplay({ message, isOwn, agentName }: MessageDisplayProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isOwn
            ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
            : 'bg-white border border-violet-200 text-gray-800'
        }`}
      >
        {!isOwn && agentName && (
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="text-xs font-semibold text-violet-600">{agentName}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
              <span aria-hidden>🛡️</span>
              Suggestion · parent decides
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-violet-200' : 'text-gray-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function VividInputArea({ onSend, placeholder, disabled }: InputAreaProps) {
  const [text, setText] = useState('');
  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };
  return (
    <div className="border-t border-violet-200 bg-white/80 backdrop-blur-sm p-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={placeholder ?? 'Type a message...'}
          disabled={disabled}
          className="flex-1 rounded-xl border border-violet-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 text-sm font-medium text-white hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function VividThreadList({ threads, activeThreadId, onSelectThread, onNewThread, agents }: ThreadListProps) {
  return (
    <div className="p-4">
      <button
        onClick={onNewThread}
        className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-3 text-sm font-medium text-white hover:from-violet-600 hover:to-pink-600 mb-4 transition-all"
      >
        + New Chat
      </button>
      <div className="space-y-2">
        {threads.map(thread => {
          const agent = agents.find(a => a.id === thread.agentId);
          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                thread.id === activeThreadId
                  ? 'bg-violet-100 border-2 border-violet-400'
                  : 'bg-white border border-violet-200 hover:bg-violet-50'
              }`}
            >
              <p className="font-medium text-sm text-gray-800 truncate">{thread.title}</p>
              {agent && <p className="text-xs text-violet-500 mt-1">with {agent.name}</p>}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(thread.updatedAt).toLocaleDateString()}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VividPlanView({ plans, onApprove, onReject }: PlanViewProps) {
  return (
    <div className="p-6 space-y-4">
      {plans.map(plan => (
        <div key={plan.id} className="rounded-2xl border border-violet-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">{plan.title}</h3>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                plan.status === 'active' ? 'bg-green-100 text-green-700'
                : plan.status === 'proposed' ? 'bg-yellow-100 text-yellow-700'
                : plan.status === 'completed' ? 'bg-gray-100 text-gray-500'
                : 'bg-violet-100 text-violet-700'
              }`}
            >
              {plan.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
          <ul className="space-y-2 mb-4">
            {plan.items.map(item => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    item.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {item.completed ? '\u2713' : '\u25CB'}
                </span>
                <span className={item.completed ? 'line-through text-gray-400' : 'text-gray-700'}>
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
          {plan.status === 'proposed' && (
            <div className="flex gap-2">
              {onApprove && (
                <button
                  onClick={() => onApprove(plan.id)}
                  className="px-4 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600"
                >
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(plan.id)}
                  className="px-4 py-2 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                >
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {plans.length === 0 && (
        <p className="text-center text-gray-400 py-12">No plans yet. Start a conversation to create one!</p>
      )}
    </div>
  );
}

function VividCoursePlanView({ plan, onChangeTier }: CoursePlanViewProps) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Course Plan</h3>
        <div className="flex gap-2">
          {(['light', 'standard', 'ambitious'] as const).map(tier => (
            <button
              key={tier}
              onClick={() => onChangeTier?.(tier)}
              className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${
                plan.tier === tier
                  ? 'bg-violet-500 text-white'
                  : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div className="rounded-xl bg-violet-50 p-3">
          <p className="text-2xl font-bold text-violet-600">{plan.totalHoursPerWeek}h</p>
          <p className="text-xs text-gray-500">per week</p>
        </div>
        <div className="rounded-xl bg-pink-50 p-3">
          <p className="text-2xl font-bold text-pink-600">${plan.totalCostPerMonth}</p>
          <p className="text-xs text-gray-500">per month</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-2xl font-bold text-amber-600">{plan.score}</p>
          <p className="text-xs text-gray-500">score</p>
        </div>
      </div>
      <div className="space-y-2">
        {plan.courses.map(course => (
          <div key={course.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div>
              <p className="font-medium text-sm text-gray-800">{course.name}</p>
              <p className="text-xs text-gray-500">
                {course.category} &middot; {course.hoursPerWeek}h/week
              </p>
            </div>
            <p className="text-sm font-medium text-violet-600">${course.costPerMonth}/mo</p>
          </div>
        ))}
      </div>
      {plan.conflicts.length > 0 && (
        <div className="mt-4 rounded-xl bg-red-50 p-3">
          <p className="text-xs font-medium text-red-600 mb-1">Schedule Conflicts</p>
          {plan.conflicts.map((c, i) => (
            <p key={i} className="text-xs text-red-500">
              {c.courseA} &amp; {c.courseB} on {c.day} ({c.overlapHours}h overlap)
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function VividMemoryView({ entries, memberName }: MemoryViewProps) {
  return (
    <div className="p-6">
      <h3 className="font-bold text-gray-800 mb-4">{memberName}&apos;s Portfolio</h3>
      <div className="space-y-3">
        {entries.map(entry => (
          <div key={entry.id} className="rounded-xl border border-violet-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs rounded-full">
                {entry.category}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(entry.capturedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-700">{entry.content}</p>
            <div className="flex gap-1 mt-2">
              {entry.tags.map(tag => (
                <span key={tag} className="text-xs text-gray-400">#{tag}</span>
              ))}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-center text-gray-400 py-8">No memories captured yet.</p>
        )}
      </div>
    </div>
  );
}

function VividMemberCard({ member, agent, onClick }: MemberCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-violet-200 bg-white p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
          {member.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-gray-800">{member.name}</p>
          <p className="text-xs text-gray-500 capitalize">
            {member.role}
            {member.age ? `, age ${member.age}` : ''}
          </p>
          {agent && <p className="text-xs text-violet-500">Assigned: {agent.name}</p>}
        </div>
      </div>
    </button>
  );
}

export const VividChatTheme: ThemeContract = {
  id: 'vivid-chat',
  name: 'Vivid Chat',
  description: 'A vibrant, modern chat experience with gradient accents',
  palette: {
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F59E0B',
    background: '#F5F3FF',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#DDD6FE',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  components: {
    Layout: VividLayout,
    MessageDisplay: VividMessageDisplay,
    InputArea: VividInputArea,
    ThreadList: VividThreadList,
    PlanView: VividPlanView,
    CoursePlanView: VividCoursePlanView,
    MemoryView: VividMemoryView,
    MemberCard: VividMemberCard,
  },
};
