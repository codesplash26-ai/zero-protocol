import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Event, MaterialityResult } from '../../mock/pulseboard';
import { Zap, AlertTriangle, Clock, DollarSign, ChevronDown, ChevronUp, RefreshCw, Cpu, Layers } from 'lucide-react';

export interface EventFeedItemProps {
  event: Event;
  materiality?: MaterialityResult;
  onTriggerReplan: (event: Event) => void;
}

export const EventFeedItem: React.FC<EventFeedItemProps> = ({
  event,
  materiality,
  onTriggerReplan,
}) => {
  const [expanded, setExpanded] = useState(false);

  const isMaterial = materiality?.potentially_material ?? false;

  const getEventTypeBadge = (type: Event['event_type']) => {
    switch (type) {
      case 'CAPACITY_CHANGE':
        return <Badge variant="warning"><Clock size={12} style={{ marginRight: '4px' }} />Capacity Change</Badge>;
      case 'EXPERIMENT_RESULT':
        return <Badge variant="info"><Cpu size={12} style={{ marginRight: '4px' }} />Experiment Result</Badge>;
      case 'BUDGET_CHANGE':
        return <Badge variant="success"><DollarSign size={12} style={{ marginRight: '4px' }} />Budget Change</Badge>;
      case 'DEPENDENCY_CHANGE':
        return <Badge variant="teal"><Layers size={12} style={{ marginRight: '4px' }} />Dependency Change</Badge>;
      case 'COMMITMENT_CHANGE':
        return <Badge variant="danger"><Zap size={12} style={{ marginRight: '4px' }} />Commitment Change</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  return (
    <Card
      padding="md"
      style={{
        borderLeft: isMaterial ? '4px solid var(--color-warning)' : '4px solid var(--color-accent-blue)',
        backgroundColor: 'var(--color-bg-card)',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: isMaterial ? 'var(--color-warning-bg)' : 'var(--color-accent-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMaterial ? 'var(--color-warning)' : 'var(--color-accent-blue)',
              flexShrink: 0,
            }}
          >
            {isMaterial ? <AlertTriangle size={20} /> : <Zap size={20} />}
          </div>

          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              {getEventTypeBadge(event.event_type)}
              {isMaterial ? (
                <Badge variant="warning" size="sm">Potentially Material Event</Badge>
              ) : (
                <Badge variant="default" size="sm">Non-Material</Badge>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {event.id} • State v{event.state_version}
              </span>
            </div>

            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              {event.description}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
              <span>Source: {event.source || 'Governor System Event'}</span>
              <span>{event.timestamp}</span>
            </div>
          </div>
        </div>

        {/* Resource Deltas & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            {event.engineering_delta_hours !== 0 && (
              <span style={{ color: event.engineering_delta_hours > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {event.engineering_delta_hours > 0 ? `+${event.engineering_delta_hours}h Eng` : `${event.engineering_delta_hours}h Eng`}
              </span>
            )}
            {event.budget_delta_usd && event.budget_delta_usd !== 0 && (
              <span style={{ color: event.budget_delta_usd > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {event.budget_delta_usd > 0 ? `+$${event.budget_delta_usd.toLocaleString()} USD` : `-$${Math.abs(event.budget_delta_usd).toLocaleString()} USD`}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              icon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            >
              {expanded ? 'Hide Analysis' : 'Materiality Analysis'}
            </Button>

            {isMaterial && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onTriggerReplan(event)}
                icon={<RefreshCw size={14} />}
              >
                Trigger Re-Plan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Materiality Analysis Section */}
      {expanded && materiality && (
        <div
          style={{
            marginTop: '0.875rem',
            paddingTop: '0.875rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
            Governor Materiality Audit
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Affected Fields:</span>
            {materiality.affected_fields.length > 0 ? (
              materiality.affected_fields.map(field => (
                <span
                  key={field}
                  style={{
                    padding: '0.125rem 0.5rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                  }}
                >
                  {field}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>None</span>
            )}
          </div>

          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Assessment Reasons:</span>
            <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, color: 'var(--color-text-primary)' }}>
              {materiality.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
};
