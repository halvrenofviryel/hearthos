export interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  role: 'parent' | 'child';
  age?: number;
  profile: Record<string, unknown>;
}

export type StaffRole =
  | 'steward'
  | 'nanny-coach'
  | 'butler'
  | 'driver'
  | 'chef'
  | 'gardener'
  | 'critic'
  | 'guardian'
  | 'scribe'
  | 'treasurer';

export type StaffStage = 'front-stage' | 'back-stage';

export interface AgentContract {
  purpose: string;
  tier: PolicyAction;
  allowedOutputs: { read: string[]; propose: string[] };
  neverRules: string[];
  stopConditions: string[];
  proofObligations: string[];
}

export type ExecuteSubClass = 'execute-now' | 'execute-with-review' | 'execute-high-stakes';

export type ProofType = 'decision' | 'permission' | 'outcome';

export interface IntentMap {
  goals: string[];
  constraints: string[];
  preferences: string[];
  risks: string[];
}

export interface StaffAgent {
  id: string;
  /** Internal canonical name (book-canon). Kept stable for code references. */
  name: string;
  /**
   * Optional neutral label for public-facing UI surfaces. When omitted,
   * the canonical {@link name} is used. Strategic Plan §5 — code canon
   * preserved, UI label neutralised for clarity in family contexts.
   */
  uiLabel?: string;
  role: StaffRole;
  specialties: string[];
  stage: StaffStage;
  contract: AgentContract;
}

export interface AgentAssignment {
  id: string;
  agentId: string;
  memberId: string;
  instructions: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Thread {
  id: string;
  familyId: string;
  memberId: string;
  agentId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Plan {
  id: string;
  familyId: string;
  memberId: string;
  title: string;
  description: string;
  status: 'draft' | 'proposed' | 'approved' | 'active' | 'completed';
  items: PlanItem[];
  createdAt: Date;
}

export interface PlanItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface MemoryEntry {
  id: string;
  memberId: string;
  category: string;
  content: string;
  tags: string[];
  capturedAt: Date;
}

export type PolicyAction = 'READ' | 'PROPOSE' | 'EXECUTE';

export interface PolicyRequest {
  action: PolicyAction;
  resource: string;
  actor: { id: string; role: string };
  target?: { id: string; role: string };
  context?: Record<string, unknown>;
}

export interface PolicyResult {
  allowed: boolean;
  reason: string;
  requiredApprovals?: string[];
  executeSubClass?: ExecuteSubClass;
}

export type CourseTier = 'light' | 'standard' | 'ambitious';

export interface CourseOption {
  id: string;
  name: string;
  category: string;
  hoursPerWeek: number;
  costPerMonth: number;
  schedule: WeeklySchedule[];
  fatigueScore: number;
}

export interface WeeklySchedule {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startHour: number;
  endHour: number;
}

export interface CoursePlan {
  id: string;
  memberId: string;
  tier: CourseTier;
  courses: CourseOption[];
  totalHoursPerWeek: number;
  totalCostPerMonth: number;
  totalFatigueScore: number;
  conflicts: ScheduleConflict[];
  score: number;
}

export interface ScheduleConflict {
  courseA: string;
  courseB: string;
  day: string;
  overlapHours: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  policyResult?: PolicyResult;
}

export interface LLMAdapter {
  complete(prompt: string, context?: Record<string, unknown>): Promise<string>;
}

export interface WeeklyReport {
  familyId: string;
  generatedAt: Date;
  memberSummaries: MemberSummary[];
  upcomingPlans: Plan[];
  recentAuditEntries: AuditEntry[];
}

export interface MemberSummary {
  memberId: string;
  memberName: string;
  totalMessages: number;
  activePlans: number;
  recentMemories: MemoryEntry[];
  coursePlan?: CoursePlan;
}

// Phase 2: Family Shared Memory

export type FamilyMemoryCategory = 'routine' | 'preference' | 'rule' | 'milestone' | 'note';

export interface FamilyMemory {
  id: string;
  familyId: string;
  category: FamilyMemoryCategory;
  content: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

export interface MemberStatus {
  memberId: string;
  name: string;
  role: string;
  lastActivity?: Date;
  activeThreads: number;
  activePlans: number;
}

export interface FamilyStatus {
  familyId: string;
  memberStatuses: MemberStatus[];
  recentMilestones: FamilyMemory[];
  activeRules: FamilyMemory[];
  upcomingItems: string[];
}

// Phase 2: Assignment Sync

export interface AssignmentSyncResult {
  created: number;
  updated: number;
  deactivated: number;
}

// Phase 2: Agent Tasks

export interface AgentTaskResult {
  agentId: string;
  taskType: string;
  output: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
