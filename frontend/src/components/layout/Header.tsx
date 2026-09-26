import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Building2, ChevronRight, User, ChevronsUpDown, Map as MapIcon, RotateCcw, Presentation } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { useGovernorData } from '../../state/governorContext';
import { isPresentationStored, PRESENT_CLASS, storePresentation } from '../../lib/presentation';

export interface HeaderProps {
  onOpenMobileMenu: () => void;
  guideOpen: boolean;
  onToggleGuide: () => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, guideOpen, onToggleGuide, onResetDemo }) => {
  const location = useLocation();
  const { organization, isLoading } = useGovernorData();
  const [presenting, setPresenting] = useState(isPresentationStored);

  // Presentation mode lives on <html> so rem sizes scale; it only applies inside the app shell.
  useEffect(() => {
    document.documentElement.classList.toggle(PRESENT_CLASS, presenting);
    return () => document.documentElement.classList.remove(PRESENT_CLASS);
  }, [presenting]);

  const togglePresenting = () => {
    storePresentation(!presenting);
    setPresenting(!presenting);
  };

  const getPageTitle = (path: string): string => {
    switch (path) {
      case '/overview':
        return 'Overview';
      case '/decision':
        return 'Decision';
      case '/experiments':
        return 'Experiments';
      case '/approvals':
        return 'Approvals';
      case '/events':
        return 'Events';
      case '/audit':
        return 'Audit Trail';
      default:
        return 'Workspace';
    }
  };

  const currentTitle = getPageTitle(location.pathname);

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left Area: Mobile Menu + Breadcrumb / Workspace Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="eg-header-mobile-trigger">
          <IconButton
            icon={<Menu size={20} />}
            ariaLabel="Open menu"
            onClick={onOpenMobileMenu}
          />
        </div>

        {/* Startup / Workspace Selector Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            type="button"
            className="eg-workspace-selector"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.625rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-accent-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent-blue)',
              }}
            >
              <Building2 size={13} />
            </div>
            <span style={organization ? undefined : { color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {organization?.organization_name ?? (isLoading ? 'Loading…' : 'Unavailable')}
            </span>
            <ChevronsUpDown size={14} style={{ color: 'var(--color-text-muted)' }} />
          </button>

          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />

          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text-main)',
            }}
          >
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Right Area: Profile / Executive Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="eg-header-demo-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button variant={guideOpen ? 'teal' : 'outline'} size="sm" icon={<MapIcon size={14} />} onClick={onToggleGuide}>
            Demo guide
          </Button>
          <Button variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={onResetDemo} disabled={!organization}>
            Reset demo
          </Button>
          <Button
            variant={presenting ? 'teal' : 'outline'}
            size="sm"
            icon={<Presentation size={14} />}
            onClick={togglePresenting}
            aria-pressed={presenting}
            title="Larger text and no technical details, for presenting"
          >
            Present
          </Button>
        </div>
        <Badge variant="teal" size="md">
          Founder Mode
        </Badge>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            paddingLeft: '0.875rem',
            borderLeft: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <User size={16} />
          </div>
          <div className="eg-header-user-text">
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.2 }}>
              Executive Founder
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
              founder@pulseboard.io
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .eg-workspace-selector:hover {
          background-color: #F1F5F9 !important;
          border-color: #CBD5E1 !important;
        }
        @media (min-width: 768px) {
          .eg-header-mobile-trigger {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .eg-header-user-text {
            display: none !important;
          }
        }
        @media (max-width: 1100px) {
          .eg-header-demo-actions {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
