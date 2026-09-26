import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  FlaskConical,
  ShieldCheck,
  Zap,
  FileText,
  Settings,
  X,
  ShieldAlert,
  Home,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useGovernorData } from '../../state/governorContext';
import { describeGovernor } from '../../lib/governorStatus';
import { isUnansweredMaterialEvent } from '../../lib/nextStep';
import { isRunActive } from '../../hooks/usePollRun';

export interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  /** Small attention dot (e.g. an unanswered material event). */
  dot?: boolean;
  /** Pulsing indicator while a Governor run is in progress. */
  busy?: boolean;
}

interface NavGroup {
  label: string;
  hint: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    governorStatus,
    isLoading,
    pendingApprovalCount,
    materialEvents,
    stateVersion,
    latestRecommendation,
    currentRun,
  } = useGovernorData();
  const governorDisplay = describeGovernor(governorStatus, isLoading);
  const eventNeedsReplan = materialEvents.some((event) =>
    isUnansweredMaterialEvent(event, stateVersion, latestRecommendation),
  );
  const runActive =
    isRunActive(currentRun) || governorStatus?.state === 'RUNNING' || governorStatus?.state === 'REPLANNING';

  // Grouped by the Governor loop so the navigation tells the product story.
  const navGroups: NavGroup[] = [
    {
      label: 'Decide',
      hint: 'Set the goal and get a recommendation',
      items: [
        { name: 'Overview', path: '/overview', icon: <LayoutDashboard size={18} /> },
        { name: 'Decision', path: '/decision', icon: <Compass size={18} />, busy: runActive },
        { name: 'Experiments', path: '/experiments', icon: <FlaskConical size={18} /> },
      ],
    },
    {
      label: 'Govern',
      hint: 'Founder approvals for controlled actions',
      items: [
        {
          name: 'Approvals',
          path: '/approvals',
          icon: <ShieldCheck size={18} />,
          badge: pendingApprovalCount ? String(pendingApprovalCount) : undefined,
        },
      ],
    },
    {
      label: 'Adapt',
      hint: 'Real-world changes and replanning',
      items: [{ name: 'Events', path: '/events', icon: <Zap size={18} />, dot: eventNeedsReplan }],
    },
    {
      label: 'Prove',
      hint: 'Everything that happened, traceable',
      items: [{ name: 'Audit Trail', path: '/audit', icon: <FileText size={18} /> }],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 40,
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease-in-out',
        }}
        className="eg-sidebar"
      >
        {/* Top Branding Section */}
        <div
          style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.25rem',
            borderBottom: '1px solid var(--sidebar-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 118, 110, 0.25)',
                border: '1px solid rgba(45, 212, 191, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-governor-teal-accent)',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: 'var(--sidebar-text-main)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                Experiment Governor
              </div>
              <div
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: 'var(--color-governor-teal-accent)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '0.125rem',
                }}
              >
                ZERO PROTOCOL
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="eg-sidebar-mobile-close"
            style={{
              display: 'none',
              color: 'var(--sidebar-text-muted)',
              padding: '0.25rem',
            }}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: 1, padding: '1.25rem 0.75rem', overflowY: 'auto' }}>
          {navGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: '0.875rem' }}>
              <div
                title={group.hint}
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0 0.75rem 0.375rem 0.75rem',
                }}
              >
                {group.label}
              </div>
              <nav aria-label={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5625rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: isActive ? 'var(--sidebar-item-active-bg)' : 'transparent',
                      transition: 'all 0.15s ease-in-out',
                      borderLeft: isActive ? '3px solid var(--color-accent-blue)' : '3px solid transparent',
                    })}
                    className={({ isActive }) => (isActive ? 'eg-nav-item active' : 'eg-nav-item')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="eg-nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <Badge variant="warning" size="sm">
                        <span aria-label={`${item.badge} pending`}>{item.badge}</span>
                      </Badge>
                    )}
                    {item.dot && (
                      <span
                        className="eg-nav-dot"
                        role="status"
                        aria-label="Material event waiting for a replan"
                        title="Material event waiting for a replan"
                      />
                    )}
                    {item.busy && (
                      <span className="eg-nav-busy" role="status" aria-label="Governor is working" title="Governor is working" />
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
          <style>{`
            .eg-nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,0.25); }
            .eg-nav-busy { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(96,165,250,0.35); border-top-color: #60A5FA; animation: eg-nav-spin 0.9s linear infinite; }
            @keyframes eg-nav-spin { to { transform: rotate(360deg); } }
            @media (prefers-reduced-motion: reduce) { .eg-nav-busy { animation: none; } }
          `}</style>

          <Link
            to="/"
            onClick={onCloseMobile}
            className="eg-nav-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '1rem',
              padding: '0.5625rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: '#94A3B8',
              borderLeft: '3px solid transparent',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            <Home size={16} />
            <span>Product home</span>
          </Link>
        </div>

        {/* Bottom Section */}
        <div
          style={{
            padding: '1rem 0.75rem',
            borderTop: '1px solid var(--sidebar-border)',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              color: '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="eg-sidebar-settings"
          >
            <Settings size={18} />
            <span>Settings</span>
          </div>

          {/* Governor Engine Status Badge Box */}
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(15, 118, 110, 0.2)',
              border: '1px solid rgba(45, 212, 191, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: governorDisplay.dot,
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#5EEAD4', fontWeight: 600, lineHeight: 1.2 }}>
                {governorDisplay.title}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(94, 234, 212, 0.7)' }}>
                {governorDisplay.detail}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .eg-nav-item:hover:not(.active) {
          background-color: var(--sidebar-item-hover) !important;
          color: #F1F5F9 !important;
        }
        .eg-sidebar-settings:hover {
          background-color: var(--sidebar-item-hover) !important;
          color: #FFFFFF !important;
        }
        @media (min-width: 768px) {
          .eg-sidebar {
            transform: translateX(0) !important;
          }
          .eg-sidebar-mobile-close {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .eg-sidebar-mobile-close {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};
