import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { LiveDataState } from '../components/ui/LiveDataState';
import { StrategyCard } from '../components/decision/StrategyCard';
import { EvidencePanel } from '../components/decision/EvidencePanel';
import { RecommendationBanner } from '../components/decision/RecommendationBanner';
import { RunStatusCard } from '../components/decision/RunStatusCard';
import { useGovernorData } from '../state/governorContext';
import { useApiResource } from '../hooks/useApiResource';
import { isRunActive } from '../hooks/usePollRun';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { describeApiError } from '../lib/apiErrors';
import type { Goal } from '../types/contract';
import { Target, Calendar, Lock, Play } from 'lucide-react';

const GoalCard: React.FC<{ goal: Goal; primaryConstraint: string | null }> = ({ goal, primaryConstraint }) => (
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
            FOUNDER GOAL (ID: {goal.id})
          </div>
          <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>Strategic Decision Target</CardTitle>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Badge variant="info">
          <Calendar size={12} />
          <span>Horizon: {goal.horizon_weeks} weeks</span>
        </Badge>
        {goal.protected_commitments.length > 0 && (
          <Badge variant="danger">
            <Lock size={12} />
            <span>Shield: {goal.protected_commitments.join(', ')}</span>
          </Badge>
        )}
      </div>
    </CardHeader>

    <CardContent style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.5 }}>
        "{goal.text}"
      </div>
      {primaryConstraint && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          <strong>Primary Constraint:</strong> {primaryConstraint}
        </div>
      )}
    </CardContent>
  </Card>
);

export const Decision: React.FC = () => {
  const { overview, decisionId, currentRun, stateVersion, isLoading, error, refresh, trackRun, refreshedAt } =
    useGovernorData();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Refetch whenever the provider reloads /overview (after runs and mutations).
  const workspace = useApiResource(
    decisionId ? `workspace:${decisionId}` : null,
    () => api.getDecisionWorkspace(decisionId!),
    `${refreshedAt}:${currentRun?.status ?? ''}`,
  );
  const approvals = useApiResource(
    decisionId ? `approvals:${decisionId}` : null,
    () => api.listApprovals({ decision_id: decisionId!, limit: 200 }),
    refreshedAt,
  );

  const activeGoal = overview?.active_goal ?? null;
  const runForDecision = currentRun && currentRun.decision_id === decisionId ? currentRun : null;
  const running = isRunActive(runForDecision) || isRunActive(workspace.data?.latest_run);
  const canStart = !!activeGoal && stateVersion !== null && !running && !starting;

  const handleRunGovernor = async () => {
    if (!activeGoal || stateVersion === null) return;
    setStarting(true);
    setActionError(null);
    try {
      const run = await api.createDecision({ goal_id: activeGoal.id, expected_state_version: stateVersion });
      trackRun(run);
      void refresh();
    } catch (caught) {
      setActionError(describeApiError(caught));
      if (caught instanceof ApiError && (caught.isConflict || caught.isNetworkError)) void refresh();
    } finally {
      setStarting(false);
    }
  };

  const header = (
    <PageHeader
      title="Decision Workspace"
      description="Founder decision workspace."
      badge={<Badge variant="teal">Decision Engine</Badge>}
      actions={
        !decisionId && activeGoal ? (
          <Button variant="teal" icon={<Play size={16} />} onClick={handleRunGovernor} disabled={!canStart}>
            {starting ? 'Starting…' : 'Run Governor'}
          </Button>
        ) : undefined
      }
    />
  );

  if (!overview || error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {header}
        <LiveDataState
          kind={isLoading ? 'loading' : 'unavailable'}
          action={isLoading ? undefined : { label: 'Retry', onClick: () => void refresh() }}
        />
      </div>
    );
  }

  const ws = workspace.data;
  const recommendation = ws?.recommendation ?? null;
  const recommendedView = recommendation
    ? (ws?.strategies.find((item) => item.id === recommendation.recommended_strategy_id) ?? null)
    : null;
  const currentApproval = recommendation
    ? (approvals.data?.items.find(
        (item) => item.experiment_id === recommendation.now[0] && item.state_version === recommendation.state_version,
      ) ?? null)
    : null;
  const latestRun = runForDecision ?? ws?.latest_run ?? null;
  const selectedId = selectedStrategyId ?? recommendation?.recommended_strategy_id ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {header}

      {actionError && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid #FECACA',
            color: 'var(--color-danger)',
            fontSize: '0.8125rem',
          }}
        >
          {actionError}
        </div>
      )}

      {/* 1. GOAL & CONSTRAINTS SUMMARY */}
      {(ws?.goal ?? activeGoal) && (
        <Section>
          <GoalCard goal={(ws?.goal ?? activeGoal)!} primaryConstraint={ws?.primary_constraint ?? null} />
        </Section>
      )}

      {!decisionId ? (
        <LiveDataState
          kind="empty"
          title="No Governor decision yet"
          message={
            activeGoal
              ? 'Run the Governor to evaluate the proposed experiments against current capacity, budget and commitments.'
              : 'No active goal has been recorded, so the Governor has nothing to evaluate.'
          }
          action={activeGoal ? { label: starting ? 'Starting…' : 'Run Governor', onClick: handleRunGovernor, disabled: !canStart } : undefined}
        />
      ) : workspace.isLoading ? (
        <LiveDataState kind="loading" title="Loading decision workspace…" />
      ) : workspace.error && !ws ? (
        <LiveDataState
          kind="error"
          title="The decision workspace could not be loaded"
          message={describeApiError(workspace.error)}
          action={{ label: 'Retry', onClick: workspace.reload }}
        />
      ) : (
        <>
          {/* 2. RUN STATUS (in progress or failed) */}
          {latestRun && (isRunActive(latestRun) || latestRun.status === 'FAILED') && (
            <Section>
              <RunStatusCard
                run={latestRun}
                onRetry={latestRun.status === 'FAILED' && !recommendation ? handleRunGovernor : undefined}
                retryDisabled={!canStart}
              />
            </Section>
          )}

          {/* 3. GOVERNOR RECOMMENDATION BANNER */}
          {recommendation ? (
            <Section>
              <RecommendationBanner
                recommendation={recommendation}
                recommendedTitle={recommendedView?.title ?? null}
                optimizationStatus={ws?.optimization_result?.status ?? null}
                approval={currentApproval}
              />
            </Section>
          ) : (
            !isRunActive(latestRun) &&
            latestRun?.status !== 'FAILED' && (
              <LiveDataState kind="empty" title="No recommendation yet" message="The Governor has not persisted a recommendation for this decision." />
            )
          )}

          {/* 4. EVALUATED STRATEGIES */}
          {ws && (
            <Section
              title="Candidate Strategies"
              description="Strategies returned by the decision workspace, with deterministic feasibility and consequences."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {ws.strategies.length === 0 ? (
                  <LiveDataState kind="empty" compact title="No strategies recorded" message="The workspace has no persisted strategies yet." />
                ) : (
                  ws.strategies.map((strat) => (
                    <StrategyCard
                      key={strat.id}
                      strategy={strat}
                      isSelected={strat.id === selectedId}
                      onSelect={() => setSelectedStrategyId(strat.id)}
                    />
                  ))
                )}
                {ws.strategies.length > 0 && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    The workspace persists the recommended strategy only; other candidates the Governor evaluated are not
                    stored by the backend.
                    {ws.optimization_result && ws.optimization_result.feasible_combinations.length > 0 && (
                      <>
                        {' '}
                        CP-SAT feasible experiment sets at state v{ws.optimization_result.evaluated_state_version}:{' '}
                        <strong style={{ color: 'var(--color-text-main)' }}>
                          {ws.optimization_result.feasible_combinations
                            .map((combo) => (combo.length ? `{${combo.join(', ')}}` : '{}'))
                            .join('  ')}
                        </strong>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* 5. EVIDENCE */}
          {ws && (
            <Section title="Supporting Evidence" description="Evidence items recorded for this goal, with provenance.">
              <EvidencePanel evidence={ws.evidence} />
            </Section>
          )}
        </>
      )}
    </div>
  );
};

export default Decision;
