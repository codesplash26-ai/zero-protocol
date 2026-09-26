import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Section } from '../components/ui/Section';
import { LiveDataState } from '../components/ui/LiveDataState';
import { MetricCard } from '../components/dashboard/MetricCard';
import { DecisionSummaryCard } from '../components/dashboard/DecisionSummaryCard';
import { GovernorStatusCard } from '../components/dashboard/GovernorStatusCard';
import { ExperimentSummaryTable } from '../components/dashboard/ExperimentSummaryTable';
import { ResourceAllocationSection } from '../components/dashboard/ResourceAllocationSection';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { useGovernorData } from '../state/governorContext';
import { formatUsd } from '../lib/format';
import { DollarSign, Cpu, Users, Lock } from 'lucide-react';

export const Overview: React.FC = () => {
  const { overview, governorStatus, isLoading, error, refresh } = useGovernorData();

  // Never render stale or placeholder values as the startup's current state.
  if (!overview || error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <PageHeader title="Overview" description="Your startup's current decision state and operating context." />
        <LiveDataState
          kind={isLoading ? 'loading' : 'unavailable'}
          action={isLoading ? undefined : { label: 'Retry', onClick: () => void refresh() }}
        />
      </div>
    );
  }

  const { organization_state, active_goal, experiments, commitments, latest_recommendation, recent_activity } = overview;
  const critical = commitments.filter((item) => item.priority === 'CRITICAL');
  const primaryCommitment = commitments.find((item) => item.protected) ?? commitments[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Overview"
        description="Your startup's current decision state and operating context."
        badge={<Badge variant="default">{organization_state.organization_name} Workspace</Badge>}
        actions={<Badge variant="teal">State v{organization_state.state_version}</Badge>}
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
            primaryValue={formatUsd(organization_state.budget_usd)}
            secondaryValue={`Approval required above ${formatUsd(organization_state.approval_threshold_usd)}`}
            icon={<DollarSign size={20} />}
            iconBgColor="var(--color-accent-blue-light)"
            iconColor="var(--color-accent-blue)"
          />

          <MetricCard
            label="ENGINEERING CAPACITY"
            primaryValue={`${organization_state.engineering_capacity_hours}h`}
            secondaryValue={`Reserved: ${organization_state.reserved_engineering_hours}h | Available: ${organization_state.available_engineering_hours}h`}
            icon={<Cpu size={20} />}
            iconBgColor="var(--color-governor-teal-light)"
            iconColor="var(--color-governor-teal)"
          />

          <MetricCard
            label="ELIGIBLE TRAFFIC"
            primaryValue={organization_state.eligible_traffic.toLocaleString()}
            secondaryValue="Currently allocatable sessions"
            icon={<Users size={20} />}
            iconBgColor="var(--color-accent-blue-light)"
            iconColor="var(--color-accent-blue)"
          />

          <MetricCard
            label="ACTIVE COMMITMENTS"
            primaryValue={critical.length > 0 ? `${critical.length} Critical` : `${commitments.length} Total`}
            secondaryValue={primaryCommitment ? `Primary: ${primaryCommitment.name}` : 'No commitments recorded'}
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
              goal={active_goal}
              recommendationState={latest_recommendation?.recommended_strategy_id ?? null}
              recommendationVersion={latest_recommendation?.state_version ?? null}
            />
          </div>
          <div style={{ flex: 1 }}>
            <GovernorStatusCard status={governorStatus} isLoading={isLoading} />
          </div>
        </div>
      </Section>

      {/* 4. EXPERIMENTS */}
      <Section>
        <ExperimentSummaryTable experiments={experiments} />
      </Section>

      {/* 5. COMMITMENT & RESOURCE PRESSURE */}
      <Section>
        <ResourceAllocationSection organizationState={organization_state} commitments={commitments} />
      </Section>

      {/* 6. RECENT ACTIVITY */}
      <Section>
        <ActivityTimeline activities={recent_activity} />
      </Section>
    </div>
  );
};

export default Overview;
