import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const navItems: NavItem[] = [
    { name: 'Overview', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Decision', path: '/decision', icon: <Compass size={18} /> },
    { name: 'Experiments', path: '/experiments', icon: <FlaskConical size={18} /> },
    { name: 'Approvals', path: '/approvals', icon: <ShieldCheck size={18} /> },
    { name: 'Events', path: '/events', icon: <Zap size={18} /> },
    { name: 'Audit Trail', path: '/audit', icon: <FileText size={18} /> },
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
          <div
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 0.75rem 0.625rem 0.75rem',
            }}
          >
            Workspace Navigation
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
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
                  <Badge variant="teal" size="sm">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
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
                  backgroundColor: 'var(--color-governor-teal-accent)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#5EEAD4', fontWeight: 600, lineHeight: 1.2 }}>
                Governor Engine Active
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(94, 234, 212, 0.7)' }}>
                Decision Ready
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
