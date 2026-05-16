import type { ReactNode, ComponentType } from 'react';
import type { Message, Thread, Plan, CoursePlan, MemoryEntry, StaffAgent, FamilyMember } from '@hearthos/core';

export interface MessageDisplayProps {
  message: Message;
  isOwn: boolean;
  agentName?: string;
}

export interface InputAreaProps {
  onSend: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  agents: StaffAgent[];
}

export interface PlanViewProps {
  plans: Plan[];
  onApprove?: (planId: string) => void;
  onReject?: (planId: string) => void;
}

export interface CoursePlanViewProps {
  plan: CoursePlan;
  onChangeTier?: (tier: string) => void;
}

export interface MemoryViewProps {
  entries: MemoryEntry[];
  memberName: string;
}

export interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  title: string;
}

export interface MemberCardProps {
  member: FamilyMember;
  agent?: StaffAgent;
  onClick?: () => void;
}

export interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeContract {
  id: string;
  name: string;
  description: string;
  palette: ThemePalette;
  components: {
    Layout: ComponentType<LayoutProps>;
    MessageDisplay: ComponentType<MessageDisplayProps>;
    InputArea: ComponentType<InputAreaProps>;
    ThreadList: ComponentType<ThreadListProps>;
    PlanView: ComponentType<PlanViewProps>;
    CoursePlanView: ComponentType<CoursePlanViewProps>;
    MemoryView: ComponentType<MemoryViewProps>;
    MemberCard: ComponentType<MemberCardProps>;
  };
}
