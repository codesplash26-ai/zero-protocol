import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { EventFeedItem } from '../components/events/EventFeedItem';
import { MaterialEventAlertBanner } from '../components/events/MaterialEventAlertBanner';
import { ReplanningFlowModal } from '../components/events/ReplanningFlowModal';
import { SimulateEventModal } from '../components/events/SimulateEventModal';
import { pulseboardMockData, type Event, type MaterialityResult } from '../mock/pulseboard';
import { RefreshCw, PlusCircle, CheckCircle2, Filter, ShieldCheck } from 'lucide-react';

export const Events: React.FC = () => {
  const [data, setData] = useState(pulseboardMockData);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [activeReplanEvent, setActiveReplanEvent] = useState<{
    event: Event;
    materiality: MaterialityResult;
  } | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [resolvedEvents, setResolvedEvents] = useState<string[]>([]);

  // Find active material event that has not been resolved by replanning
  const activeMaterialEvent = data.events.find(e => {
    const mat = data.materiality_results.find(m => m.event_id === e.id);
    return mat?.potentially_material && !resolvedEvents.includes(e.id);
  });
  const activeMateriality = activeMaterialEvent
    ? data.materiality_results.find(m => m.event_id === activeMaterialEvent.id)
    : undefined;

  // Filtered Events Feed
  const filteredEvents = data.events.filter(e => {
    if (filterType === 'MATERIAL') {
      const mat = data.materiality_results.find(m => m.event_id === e.id);
      return mat?.potentially_material;
    }
    if (filterType !== 'ALL') {
      return e.event_type === filterType;
    }
    return true;
  });

  const handleOpenReplan = (event: Event) => {
    const mat = data.materiality_results.find(m => m.event_id === event.id) || {
      event_id: event.id,
      potentially_material: true,
      affected_fields: ['available_engineering_hours'],
      reasons: ['Capacity delta triggered re-evaluation threshold'],
    };
    setActiveReplanEvent({ event, materiality: mat });
  };

  const handleApplyReplan = (newStrategyId: string) => {
    if (!activeReplanEvent) return;

    const eventId = activeReplanEvent.event.id;
    setResolvedEvents(prev => [...prev, eventId]);

    // Update PulseBoard state to reflect Observe → Adapt replan result
    setData(prev => ({
      ...prev,
      organization_state: {
        ...prev.organization_state,
        state_version: prev.organization_state.state_version + 1,
        reserved_engineering_hours: 18, // 36h SSO - 18h freed = 18h
        available_engineering_hours: 42, // 60h total - 18h reserved = 42h remaining
      },
      governor_status: {
        state: 'Active',
        decision_cycle: `Adapted Strategy (${newStrategyId}) Unlocked & Requires Founder Approval`,
        last_activity: 'Just now',
      },
      decision_workspace: {
        ...prev.decision_workspace,
        recommendation: {
          ...prev.decision_workspace.recommendation,
          recommended_strategy_id: newStrategyId,
          requires_approval: true,
          reasoning_summary:
            'Governor Observe-Adapt engine successfully re-planned around the 18h SSO vendor delay. Available buffer expanded from 24h to 42h, unlocking Strategy STRATEGY-A-B (30h total). Routed to Approvals Queue (APR-001) for founder authorization.',
        },
      },
    }));

    setActiveReplanEvent(null);
    setNotification(
      `Governor Re-Plan applied! Strategy updated to ${newStrategyId}. Available buffer expanded to 42h. Routed to Approvals (APR-001).`
    );
  };

  const handleEmitSimulatedEvent = (
    newEventData: Omit<Event, 'id' | 'state_version'>,
    isMaterial: boolean,
    reasonStr: string
  ) => {
    const newId = `EVENT-00${data.events.length + 1}`;
    const newVersion = data.organization_state.state_version + 1;

    const newEvent: Event = {
      ...newEventData,
      id: newId,
      state_version: newVersion,
    };

    const newMateriality: MaterialityResult = {
      event_id: newId,
      potentially_material: isMaterial,
      affected_fields: isMaterial ? ['available_engineering_hours'] : [],
      reasons: [reasonStr],
    };

    setData(prev => ({
      ...prev,
      events: [newEvent, ...prev.events],
      materiality_results: [newMateriality, ...prev.materiality_results],
      governor_status: {
        ...prev.governor_status,
        state: isMaterial ? 'Replanning' : prev.governor_status.state,
        last_activity: 'Just now',
      },
    }));

    setIsSimulateOpen(false);
    setNotification(
      `Simulated Event ${newId} (${newEvent.event_type}) ingested into stream.${
        isMaterial ? ' Material event flagged for Governor replanning.' : ''
      }`
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* PAGE HEADER */}
      <PageHeader
        title="Events & Strategy Adaptation"
        description="Monitor runtime system triggers and execute Governor Observe → Adapt replanning cycles."
        badge={<Badge variant="teal">Observe → Adapt</Badge>}
        actions={
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSimulateOpen(true)}
              icon={<PlusCircle size={14} />}
            >
              Simulate Event
            </Button>
            {activeMaterialEvent && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenReplan(activeMaterialEvent)}
                icon={<RefreshCw size={14} />}
              >
                Trigger Re-Plan
              </Button>
            )}
          </div>
        }
      />

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. ACTIVE MATERIAL EVENT ALERT BANNER (If present) */}
      {activeMaterialEvent && activeMateriality && (
        <Section>
          <MaterialEventAlertBanner
            materialEvent={activeMaterialEvent}
            materiality={activeMateriality}
            onTriggerReplan={() => handleOpenReplan(activeMaterialEvent)}
          />
        </Section>
      )}

      {/* 2. SYSTEM STATE SUMMARY */}
      <Section>
        <Card padding="md">
          <CardHeader style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-governor-teal)' }} />
                <CardTitle style={{ fontSize: '0.9375rem' }}>Governor Event Monitor Status</CardTitle>
              </div>
              <Badge variant="teal">State Version {data.organization_state.state_version}</Badge>
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
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Governor State</div>
                <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.9375rem' }}>{data.governor_status.state}</strong>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{data.governor_status.decision_cycle}</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Available Eng Buffer</div>
                <strong style={{ color: data.organization_state.available_engineering_hours <= 6 ? 'var(--color-warning)' : 'var(--color-text-primary)', fontSize: '0.9375rem' }}>
                  {data.organization_state.available_engineering_hours}h / {data.organization_state.engineering_capacity_hours}h
                </strong>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{data.organization_state.reserved_engineering_hours}h locked</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Active Strategy</div>
                <strong style={{ color: 'var(--color-accent-blue)', fontSize: '0.9375rem' }}>
                  {data.decision_workspace.recommendation.recommended_strategy_id}
                </strong>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Goal GOAL-001</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 3. EVENT STREAM FEED & FILTERS */}
      <Section title={`Chronological Event Feed (${filteredEvents.length})`}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>
            <Filter size={14} />
            Filter:
          </div>

          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'MATERIAL', label: 'Material Only' },
            { id: 'CAPACITY_CHANGE', label: 'Capacity Changes' },
            { id: 'EXPERIMENT_RESULT', label: 'Experiment Results' },
            { id: 'BUDGET_CHANGE', label: 'Budget Changes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: filterType === tab.id ? 'var(--color-governor-teal)' : 'var(--color-border)',
                backgroundColor: filterType === tab.id ? 'var(--color-governor-teal-light)' : 'var(--color-bg-card)',
                color: filterType === tab.id ? 'var(--color-governor-teal)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredEvents.length === 0 ? (
            <Card padding="md">
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                No events match the selected filter.
              </p>
            </Card>
          ) : (
            filteredEvents.map(event => {
              const materiality = data.materiality_results.find(m => m.event_id === event.id);
              return (
                <EventFeedItem
                  key={event.id}
                  event={event}
                  materiality={materiality}
                  onTriggerReplan={handleOpenReplan}
                />
              );
            })
          )}
        </div>
      </Section>

      {/* REPLANNING MODAL */}
      {activeReplanEvent && (
        <ReplanningFlowModal
          event={activeReplanEvent.event}
          materiality={activeReplanEvent.materiality}
          onClose={() => setActiveReplanEvent(null)}
          onApplyReplan={handleApplyReplan}
        />
      )}

      {/* SIMULATE EVENT MODAL */}
      {isSimulateOpen && (
        <SimulateEventModal
          onClose={() => setIsSimulateOpen(false)}
          onEmitEvent={handleEmitSimulatedEvent}
        />
      )}
    </div>
  );
};

export default Events;
