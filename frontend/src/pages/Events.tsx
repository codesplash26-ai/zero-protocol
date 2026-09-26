import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LiveDataState } from '../components/ui/LiveDataState';
import { EventFeedItem } from '../components/events/EventFeedItem';
import { MaterialEventAlertBanner } from '../components/events/MaterialEventAlertBanner';
import { ReplanningFlowModal } from '../components/events/ReplanningFlowModal';
import { SimulateEventModal, type SimulatedEventInput } from '../components/events/SimulateEventModal';
import { EventPresets } from '../components/events/EventPresets';
import { useGovernorData } from '../state/governorContext';
import { useApiResource } from '../hooks/useApiResource';
import { isRunActive } from '../hooks/usePollRun';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { describeApiError } from '../lib/apiErrors';
import { describeGovernor } from '../lib/governorStatus';
import type { Event, MaterialityResult } from '../types/contract';
import { RefreshCw, PlusCircle, CheckCircle2, Filter, ShieldCheck, AlertTriangle } from 'lucide-react';

interface EventsData {
  events: Event[];
  materiality: Record<string, MaterialityResult | null>;
}

/**
 * Events newest first, each with its stored materiality. The potentially_material
 * filter only returns evaluated events, so details are fetched just for those;
 * events the backend records itself (e.g. controlled actions) stay unevaluated.
 */
async function loadEvents(): Promise<EventsData> {
  const [page, material, notMaterial] = await Promise.all([
    api.listEvents({ limit: 200 }),
    api.listEvents({ potentially_material: true, limit: 200 }),
    api.listEvents({ potentially_material: false, limit: 200 }),
  ]);
  const evaluatedIds = [...material.items, ...notMaterial.items].map((event) => event.id);
  const results = await Promise.all(evaluatedIds.map((eventId) => api.getMateriality(eventId)));
  const materiality: Record<string, MaterialityResult | null> = {};
  page.items.forEach((event) => {
    materiality[event.id] = null;
  });
  results.forEach((result) => {
    materiality[result.event_id] = result;
  });
  return { events: page.items, materiality };
}

type Notice = { tone: 'success' | 'error'; text: string };

const FILTERS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'MATERIAL', label: 'Material Only' },
  { id: 'CAPACITY_CHANGE', label: 'Capacity Changes' },
  { id: 'EXPERIMENT_RESULT', label: 'Experiment Results' },
  { id: 'BUDGET_CHANGE', label: 'Budget Changes' },
];

export const Events: React.FC = () => {
  const {
    overview,
    stateVersion,
    governorStatus,
    latestRecommendation,
    decisionId,
    currentRun,
    refreshedAt,
    isLoading,
    error,
    refresh,
    trackRun,
  } = useGovernorData();
  const data = useApiResource('events', loadEvents, refreshedAt);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [replanEventId, setReplanEventId] = useState<string | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const events = data.data?.events ?? [];
  const materialityById = data.data?.materiality ?? {};
  const runInProgress = isRunActive(currentRun);

  // A material event still needs an answer while it describes the current state
  // and no recommendation has been generated for that state yet.
  const isUnanswered = (event: Event) =>
    materialityById[event.id]?.potentially_material === true &&
    event.state_version === stateVersion &&
    !(latestRecommendation && latestRecommendation.state_version >= event.state_version);
  const activeMaterialEvent = events.find(isUnanswered) ?? null;

  const filteredEvents = events.filter((event) => {
    if (filterType === 'MATERIAL') return materialityById[event.id]?.potentially_material === true;
    if (filterType !== 'ALL') return event.event_type === filterType;
    return true;
  });

  const replanEvent = events.find((event) => event.id === replanEventId) ?? null;
  const replanMateriality = replanEvent ? materialityById[replanEvent.id] : null;
  const replanRun = replanEvent && currentRun?.trigger_event_id === replanEvent.id ? currentRun : null;

  const handleEmitEvent = async (input: SimulatedEventInput) => {
    if (stateVersion === null) return;
    setSubmitting(true);
    setSimulateError(null);
    let created: Event;
    try {
      created = await api.createEvent({ ...input, occurred_at: new Date().toISOString(), expected_state_version: stateVersion });
    } catch (caught) {
      setSimulateError(describeApiError(caught));
      if (caught instanceof ApiError && (caught.isConflict || caught.isNetworkError)) void refresh();
      setSubmitting(false);
      return;
    }

    setIsSimulateOpen(false);
    try {
      const materiality = await api.evaluateMateriality(created.id);
      setNotice({
        tone: 'success',
        text: `${created.id} recorded at state v${created.state_version}. Backend materiality: ${
          materiality.potentially_material ? 'potentially material' : 'not material'
        }${materiality.reasons.length ? ` — ${materiality.reasons.join('; ')}` : ''}.`,
      });
    } catch (caught) {
      setNotice({
        tone: 'error',
        text: `${created.id} was recorded, but materiality could not be evaluated: ${describeApiError(caught)}`,
      });
    } finally {
      setSubmitting(false);
      void refresh();
    }
  };

  const handleRequestReplan = async () => {
    if (!replanEvent || stateVersion === null) return;
    if (!decisionId) {
      setReplanError('No Governor decision exists yet. Run the Governor on the Decision page first.');
      return;
    }
    setSubmitting(true);
    setReplanError(null);
    try {
      const run = await api.requestReplan(decisionId, {
        trigger_event_id: replanEvent.id,
        expected_state_version: stateVersion,
      });
      trackRun(run);
      void refresh();
    } catch (caught) {
      setReplanError(describeApiError(caught));
      if (caught instanceof ApiError && (caught.isConflict || caught.isNetworkError)) void refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const openReplan = (event: Event) => {
    setReplanError(null);
    setReplanEventId(event.id);
  };

  const header = (
    <PageHeader
      title="Events & Strategy Adaptation"
      description="Monitor runtime system triggers and execute Governor Observe → Adapt replanning cycles."
      badge={<Badge variant="teal">Observe → Adapt</Badge>}
      actions={
        overview && !error ? (
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSimulateError(null);
                setIsSimulateOpen(true);
              }}
              icon={<PlusCircle size={14} />}
              disabled={runInProgress}
            >
              Simulate Event
            </Button>
            {activeMaterialEvent && (
              <Button variant="primary" size="sm" onClick={() => openReplan(activeMaterialEvent)} icon={<RefreshCw size={14} />}>
                Trigger Re-Plan
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );

  if (!overview || error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {header}
        <LiveDataState
          kind={isLoading ? 'loading' : 'unavailable'}
          action={isLoading ? undefined : { label: 'Retry', onClick: () => void refresh() }}
        />
      </div>
    );
  }

  const organization = overview.organization_state;
  const governor = describeGovernor(governorStatus, isLoading);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {header}

      {/* NOTIFICATION */}
      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: notice.tone === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${notice.tone === 'error' ? '#FECACA' : '#BBF7D0'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-main)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {notice.tone === 'error' ? (
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. ACTIVE MATERIAL EVENT ALERT BANNER */}
      {activeMaterialEvent && materialityById[activeMaterialEvent.id] && (
        <Section>
          <MaterialEventAlertBanner
            materialEvent={activeMaterialEvent}
            materiality={materialityById[activeMaterialEvent.id]!}
            onTriggerReplan={() => openReplan(activeMaterialEvent)}
            busy={runInProgress}
          />
        </Section>
      )}

      {/* 2. SYSTEM STATE SUMMARY */}
      <Section>
        <Card padding="md">
          <CardHeader style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-governor-teal)' }} />
                <CardTitle style={{ fontSize: '0.9375rem' }}>Governor Event Monitor Status</CardTitle>
              </div>
              <Badge variant="teal">State Version {organization.state_version}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Governor State</div>
                <strong style={{ color: 'var(--color-text-main)', fontSize: '0.9375rem' }}>{governor.short}</strong>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{governor.detail}</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Available Eng Buffer</div>
                <strong style={{ color: 'var(--color-text-main)', fontSize: '0.9375rem' }}>
                  {organization.available_engineering_hours}h / {organization.engineering_capacity_hours}h
                </strong>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {organization.reserved_engineering_hours}h reserved
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Active Strategy</div>
                <strong style={{ color: latestRecommendation ? 'var(--color-accent-blue)' : 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
                  {latestRecommendation?.recommended_strategy_id ?? 'No recommendation yet'}
                </strong>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {overview.active_goal ? `Goal ${overview.active_goal.id}` : 'No active goal'}
                  {latestRecommendation ? ` • generated at state v${latestRecommendation.state_version}` : ''}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 2b. ONE-CLICK EVENT PRESETS */}
      <Section>
        <EventPresets
          experiments={overview.experiments}
          commitments={overview.commitments}
          availableHours={organization.available_engineering_hours}
          disabled={runInProgress || submitting}
          onEmit={(event) => void handleEmitEvent(event)}
          onCustom={() => {
            setSimulateError(null);
            setIsSimulateOpen(true);
          }}
        />
      </Section>

      {/* 3. EVENT STREAM FEED & FILTERS */}
      <Section title={`Chronological Event Feed (${filteredEvents.length})`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>
            <Filter size={14} />
            Filter:
          </div>
          {FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '999px',
                border: '1px solid',
                borderColor: filterType === tab.id ? 'var(--color-governor-teal)' : 'var(--color-border)',
                backgroundColor: filterType === tab.id ? 'var(--color-governor-teal-light)' : 'var(--color-card)',
                color: filterType === tab.id ? 'var(--color-governor-teal)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.isLoading ? (
            <LiveDataState kind="loading" compact title="Loading events…" />
          ) : data.error && !data.data ? (
            <LiveDataState kind="error" compact message={describeApiError(data.error)} action={{ label: 'Retry', onClick: data.reload }} />
          ) : filteredEvents.length === 0 ? (
            <Card padding="md">
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                {events.length === 0 ? 'No events have been recorded yet.' : 'No events match the selected filter.'}
              </p>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <EventFeedItem
                key={event.id}
                event={event}
                materiality={materialityById[event.id] ?? null}
                canReplan={isUnanswered(event) && !runInProgress}
                onTriggerReplan={openReplan}
              />
            ))
          )}
        </div>
      </Section>

      {/* REPLANNING MODAL */}
      {replanEvent && replanMateriality && (
        <ReplanningFlowModal
          event={replanEvent}
          materiality={replanMateriality}
          run={replanRun}
          recommendation={latestRecommendation}
          requesting={submitting}
          error={replanError}
          canRequest={!runInProgress && isUnanswered(replanEvent)}
          onRequestReplan={handleRequestReplan}
          onClose={() => setReplanEventId(null)}
        />
      )}

      {/* SIMULATE EVENT MODAL */}
      {isSimulateOpen && (
        <SimulateEventModal
          experiments={overview.experiments}
          commitments={overview.commitments}
          submitting={submitting}
          error={simulateError}
          onClose={() => !submitting && setIsSimulateOpen(false)}
          onEmitEvent={handleEmitEvent}
        />
      )}
    </div>
  );
};

export default Events;
