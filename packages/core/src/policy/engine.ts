import { PolicyRequest, PolicyResult, ExecuteSubClass } from '../types';

// Keywords that indicate high-stakes actions
const HIGH_STAKES_KEYWORDS = [
  'subscription', 'annual', 'delete', 'remove', 'share-external',
  'payment', 'contract', 'irreversible', 'publish', 'broadcast',
];

// Keywords that indicate medium-risk actions needing review
const REVIEW_KEYWORDS = [
  'booking', 'trial', 'enroll', 'register', 'schedule-change',
  'purchase', 'invite', 'permission-change',
];

export class PolicyEngine {
  evaluate(request: PolicyRequest): PolicyResult {
    switch (request.action) {
      case 'READ':
        return this.evaluateRead(request);
      case 'PROPOSE':
        return this.evaluatePropose(request);
      case 'EXECUTE':
        return this.evaluateExecute(request);
      default:
        return { allowed: false, reason: `Unknown action: ${request.action}` };
    }
  }

  classifyExecute(action: string): ExecuteSubClass {
    const lower = action.toLowerCase();

    if (HIGH_STAKES_KEYWORDS.some(k => lower.includes(k))) {
      return 'execute-high-stakes';
    }

    if (REVIEW_KEYWORDS.some(k => lower.includes(k))) {
      return 'execute-with-review';
    }

    return 'execute-now';
  }

  private evaluateRead(request: PolicyRequest): PolicyResult {
    const { actor, target } = request;

    if (actor.role === 'parent') {
      return { allowed: true, reason: 'Parents have full read access' };
    }

    if (actor.role === 'staff') {
      return { allowed: true, reason: 'Staff can read family data' };
    }

    if (actor.role === 'child') {
      if (!target || target.id === actor.id) {
        return { allowed: true, reason: 'Children can read their own data' };
      }
      return { allowed: false, reason: 'Children cannot read other members\' data' };
    }

    return { allowed: false, reason: 'Unknown role' };
  }

  private evaluatePropose(request: PolicyRequest): PolicyResult {
    const { actor, target } = request;

    if (actor.role === 'parent') {
      return { allowed: true, reason: 'Parents can propose changes' };
    }

    if (actor.role === 'staff') {
      return { allowed: true, reason: 'Staff can propose changes' };
    }

    if (actor.role === 'child') {
      if (target && target.id === actor.id) {
        return { allowed: true, reason: 'Children can propose changes to their own plans' };
      }
      return { allowed: false, reason: 'Children can only propose changes to their own plans' };
    }

    return { allowed: false, reason: 'Unknown role' };
  }

  private evaluateExecute(request: PolicyRequest): PolicyResult {
    const { actor } = request;
    const subClass = this.classifyExecute(request.resource);

    if (actor.role === 'parent') {
      return {
        allowed: true,
        reason: 'Parents can execute changes',
        executeSubClass: subClass,
      };
    }

    if (actor.role === 'staff') {
      return {
        allowed: false,
        reason: 'Staff need parent approval to execute changes',
        requiredApprovals: ['parent'],
        executeSubClass: subClass,
      };
    }

    if (actor.role === 'child') {
      return {
        allowed: false,
        reason: 'Children cannot execute changes',
        executeSubClass: subClass,
      };
    }

    return { allowed: false, reason: 'Unknown role' };
  }
}
