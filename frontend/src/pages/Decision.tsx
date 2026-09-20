import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Section } from '../components/ui/Section';
import { StrategyCard } from '../components/decision/StrategyCard';
import { EvidencePanel } from '../components/decision/EvidencePanel';
import { RecommendationBanner } from '../components/decision/RecommendationBanner';
import { pulseboardMockData } from '../mock/pulseboard';
import { Target, Calendar, Lock } from 'lucide-react';

export const Decision: React.FC = () => {
  const { decision_workspace } = pulseboardMockData;
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('STRATEGY-A-B');

  const selectedStrategy =
    decision_workspace.strategies.find((s) => s.id === selectedStrategyId) ||
    decision_workspace.strategies[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Decision Workspace"
        description="Founder decision workspace."
        badge={<Badge variant="teal">Decision Engine</Badge>}
      />

      {/* 2. GOAL & CONSTRAINTS SUMMARY */}
      <Section>
        <Card padding="lg" style={{ borderLeft: '4px solid var(--color-accent-blue)' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-accent-blue-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent-blue)',
                }}
              >
                <Target size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  FOUNDER GOAL (ID: {decision_workspace.goal.id})
                </div>
                <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
                  Strategic Decision Target
                </CardTitle>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Badge variant="info">
                <Calendar size={12} />
                <span>Horizon: {decision_workspace.goal.horizon_weeks} weeks</span>
              </Badge>
              <Badge variant="danger">
                <Lock size={12} />
                <span>Shield: {decision_workspace.goal.protected_commitments.join(', ')}</span>
              </Badge>
            </div>
          </CardHeader>

          <CardContent style={{ marginTop: '0.5rem' }}>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-main)',
                lineHeight: 1.5,
              }}
            >
              "{decision_workspace.goal.text}"
            </div>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginTop: '0.5rem',
              }}
            >
              <strong>Primary Constraint:</strong> {decision_workspace.primary_constraint}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 3. GOVERNOR RECOMMENDATION BANNER */}
      <Section>
        <RecommendationBanner
          recommendedTitle={selectedStrategy.title}
          reasoning={decision_workspace.recommendation.reasoning_summary}
        />
      </Section>

      {/* 4. CANDIDATE STRATEGIES COMPARISON */}
      <Section title="Candidate Strategies" description="Compare evaluated strategy paths under capacity, budget, and commitment constraints.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {decision_workspace.strategies.map((strat) => (
            <StrategyCard
              key={strat.id}
              strategy={strat}
              isSelected={strat.id === selectedStrategyId}
              onSelect={() => setSelectedStrategyId(strat.id)}
            />
          ))}
        </div>
      </Section>

      {/* 5. EVIDENCE & CONSTRAINTS */}
      <Section title="Supporting Evidence" description="Empirical signals and customer feedback validating strategy rankings.">
        <EvidencePanel evidence={decision_workspace.evidence} />
      </Section>
    </div>
  );
};

export default Decision;
