import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Section } from '../components/ui/Section';
import { MetricCard } from '../components/dashboard/MetricCard';
import { DecisionSummaryCard } from '../components/dashboard/DecisionSummaryCard';
import { GovernorStatusCard } from '../components/dashboard/GovernorStatusCard';
import { ExperimentSummaryTable } from '../components/dashboard/ExperimentSummaryTable';
import { ResourceAllocationSection } from '../components/dashboard/ResourceAllocationSection';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { pulseboardMockData } from '../mock/pulseboard';
import { DollarSign, Cpu, Users, Lock } from 'lucide-react';

export const Overview: React.FC = () => {
  const {
    organization_state,
    goal,
    governor_status,
    experiments,
    commitments,
    recent_activity,
    decision_workspace,
  } = pulseboardMockData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Overview"
        description="Your startup's current decision state and operating context."
        badge={<Badge variant="default">{organization_state.organization_name} Workspace</Badge>}
      />

      {/* 2. STARTUP SNAPSHOT (4 Metric Cards) */}
      <Section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <MetricCard
            label="EXPERIMENT BUDGET"
            primaryValue={`$${organization_state.available_engineering_hours ? organization_state.budget_usd.toLocaleString() : organization_state.budget_usd.toLocaleString()}`}
            secondaryValue={`Total Budget: $${organization_state.budget_usd.toLocaleString()}`}
            icon={<DollarSign size={20} />}
            iconBgColor="var(--color-accent-blue-light)"
            iconColor="var(--color-accent-blue)"
          />

          <MetricCard
            label="ENGINEERING CAPACITY"
            primaryValue={`${organization_state.engineering_capacity_hours}h`}
            secondaryValue={`Committed: ${organization_state.reserved_engineering_hours}h | Available: ${organization_state.available_engineering_hours}h`}
            icon={<Cpu size={20} />}
            iconBgColor="var(--color-governor-teal-light)"
            iconColor="var(--color-governor-teal)"
          />

          <MetricCard
            label="ELIGIBLE TRAFFIC"
            primaryValue={`${organization_state.eligible_traffic.toLocaleString()}`}
            secondaryValue="Monthly eligible user sessions"
            icon={<Users size={20} />}
            iconBgColor="var(--color-accent-blue-light)"
            iconColor="var(--color-accent-blue)"
          />

          <MetricCard
            label="ACTIVE COMMITMENTS"
            primaryValue="1 Critical"
            secondaryValue={`Primary: ${commitments[0]?.name || 'Enterprise SSO'}`}
            icon={<Lock size={20} />}
            iconBgColor="var(--color-warning-bg)"
            iconColor="var(--color-warning)"
          />
        </div>
      </Section>

      {/* 3. CURRENT DECISION & GOVERNOR STATUS */}
      <Section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            alignItems: 'stretch',
          }}
        >
          <div style={{ flex: 2 }}>
            <DecisionSummaryCard
              goal={goal}
              recommendationState={decision_workspace.recommendation.recommended_strategy_id || 'STRATEGY-A-B'}
            />
          </div>
          <div style={{ flex: 1 }}>
            <GovernorStatusCard status={governor_status} />
          </div>
        </div>
      </Section>

      {/* 4. ACTIVE EXPERIMENTS */}
      <Section>
        <ExperimentSummaryTable experiments={experiments} />
      </Section>

      {/* 5. COMMITMENT & RESOURCE PRESSURE */}
      <Section>
        <ResourceAllocationSection
          organizationState={organization_state}
          commitments={commitments}
        />
      </Section>

      {/* 6. RECENT ACTIVITY */}
      <Section>
        <ActivityTimeline activities={recent_activity} />
      </Section>
    </div>
  );
};

export default Overview;
