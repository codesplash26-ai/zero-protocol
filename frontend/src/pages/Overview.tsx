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
    startupSnapshot,
    currentDecision,
    governorStatus,
    experiments,
    commitments,
    recentActivity,
  } = pulseboardMockData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Overview"
        description="Your startup's current decision state and operating context."
        badge={<Badge variant="default">PulseBoard Workspace</Badge>}
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
            primaryValue={`${startupSnapshot.budget.currency}${startupSnapshot.budget.available.toLocaleString()}`}
            secondaryValue={`Total Budget: ${startupSnapshot.budget.currency}${startupSnapshot.budget.total.toLocaleString()}`}
            icon={<DollarSign size={20} />}
            iconBgColor="var(--color-accent-blue-light)"
            iconColor="var(--color-accent-blue)"
          />

          <MetricCard
            label="ENGINEERING CAPACITY"
            primaryValue={`${startupSnapshot.engineering.total}h`}
            secondaryValue={`Committed: ${startupSnapshot.engineering.committed}h | Available: ${startupSnapshot.engineering.available}h`}
            icon={<Cpu size={20} />}
            iconBgColor="var(--color-governor-teal-light)"
            iconColor="var(--color-governor-teal)"
          />

          <MetricCard
            label="ELIGIBLE TRAFFIC"
            primaryValue={`${startupSnapshot.traffic.eligibleSessions.toLocaleString()}`}
            secondaryValue="Monthly eligible user sessions"
            icon={<Users size={20} />}
            iconBgColor="var(--color-accent-blue-light)"
            iconColor="var(--color-accent-blue)"
          />

          <MetricCard
            label="ACTIVE COMMITMENTS"
            primaryValue={`${startupSnapshot.commitments.criticalCount} Critical`}
            secondaryValue={`Primary: ${startupSnapshot.commitments.primaryName}`}
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
            <DecisionSummaryCard decision={currentDecision} />
          </div>
          <div style={{ flex: 1 }}>
            <GovernorStatusCard status={governorStatus} />
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
          totalEngineeringHours={startupSnapshot.engineering.total}
          committedHours={startupSnapshot.engineering.committed}
          availableHours={startupSnapshot.engineering.available}
          commitments={commitments}
        />
      </Section>

      {/* 6. RECENT ACTIVITY */}
      <Section>
        <ActivityTimeline activities={recentActivity} />
      </Section>
    </div>
  );
};

export default Overview;
