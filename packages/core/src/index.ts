export * from './types';
export { PolicyEngine } from './policy/engine';
export { MemoryPortfolio } from './memory/portfolio';
export { CoursePlanner } from './planner/course-planner';
export { ConversationOrchestrator } from './orchestrator/conversation';
export { AuditLogger } from './audit/logger';
export { MockLLMAdapter } from './llm/mock-adapter';
export { OllamaAdapter } from './llm/ollama-adapter';
export type { OllamaAdapterOptions } from './llm/ollama-adapter';
export { seedFamily, seedMembers, seedAgents, seedCourses } from './seed/data';

// HouseholdState — family-readable five-dimensional signal vector
export {
  HOUSEHOLD_DIMENSIONS,
  DIMENSION_KIND,
  CONCERN_BAND_THRESHOLDS,
  emptyHouseholdState,
  clamp01,
  normaliseState,
  concernBand,
  asConcerns,
  dominantConcern,
} from './state/household-state';
export type {
  HouseholdState,
  HouseholdDimension,
  DimensionKind,
  ConcernBand,
  DimensionConcern,
} from './state/household-state';

// Phionyx-Lite gates (Strategic Plan §3, D4=C locked: core gates only)
export { evaluateInputSafety, wrapAsSafeProposal } from './gates/input-safety-gate';
export type {
  SensitiveCategory,
  ApprovalOption,
  SafetyGateResult,
  SafeProposal,
} from './gates/input-safety-gate';

export { evaluateApproval, approvalLabel } from './gates/human-approval-gate';
export type {
  ApprovalAction,
  ApprovalUrgency,
  ApprovalGateResult,
} from './gates/human-approval-gate';

// ActivityStream — Strategic Plan §3.3 / §6: family-facing replacement
// for AuditLogger semantics. UI surfaces this as "Activity History".
export { ActivityStream, fromAuditEntry } from './activity/activity-stream';
export type {
  ActivityEvent,
  ActivityInput,
  ActivityRole,
  ActivityDecision,
} from './activity/activity-stream';
