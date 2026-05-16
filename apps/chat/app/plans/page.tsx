'use client';

import { useState, useEffect, useCallback } from 'react';
import { useThemeComponents } from '@hearthos/theme-sdk';
import type { Plan, CoursePlan, CourseTier } from '@hearthos/core';
import { seedMembers } from '@hearthos/core';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function PlansPage() {
  const { Layout, PlanView, CoursePlanView, MemberCard } = useThemeComponents();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedMember, setSelectedMember] = useState(seedMembers[2]); // Lily
  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [tier, setTier] = useState<CourseTier>('standard');

  const children = seedMembers.filter(m => m.role === 'child');

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/plans?familyId=family-1`);
      setPlans(await res.json());
    } catch { /* offline */ }
  }, []);

  const fetchCoursePlan = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/course-plans?memberId=${selectedMember.id}&tier=${tier}`);
      setCoursePlan(await res.json());
    } catch { /* offline */ }
  }, [selectedMember.id, tier]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { fetchCoursePlan(); }, [fetchCoursePlan]);

  const handleApprove = async (planId: string) => {
    try {
      await fetch(`${API}/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      fetchPlans();
    } catch { /* offline */ }
  };

  const handleReject = async (planId: string) => {
    try {
      await fetch(`${API}/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      fetchPlans();
    } catch { /* offline */ }
  };

  return (
    <Layout title="Plans & Courses">
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Family Members</h2>
          <div className="grid grid-cols-2 gap-4">
            {children.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        </section>

        {coursePlan && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {selectedMember.name}&apos;s Course Plan
            </h2>
            <CoursePlanView
              plan={coursePlan}
              onChangeTier={(t) => setTier(t as CourseTier)}
            />
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Learning Plans</h2>
          <PlanView plans={plans} onApprove={handleApprove} onReject={handleReject} />
        </section>
      </div>
    </Layout>
  );
}
