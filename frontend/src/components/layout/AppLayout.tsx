import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageErrorBoundary } from './PageErrorBoundary';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ConnectionBanner } from './ConnectionBanner';
import { NextStepBar } from './NextStepBar';
import { DemoGuide } from './DemoGuide';
import { ResetDemoDialog } from './ResetDemoDialog';
import { isGuideOpenStored, storeGuideOpen } from '../../lib/demoGuide';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [guideOpen, setGuideOpen] = useState(isGuideOpenStored);
  const [resetOpen, setResetOpen] = useState(false);

  const handleOpenMobileMenu = () => setMobileOpen(true);
  const handleCloseMobileMenu = () => setMobileOpen(false);
  const setGuide = (open: boolean) => {
    storeGuideOpen(open);
    setGuideOpen(open);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Persistent Left Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={handleCloseMobileMenu} />

      {/* Main Wrapper Offset for Desktop Sidebar */}
      <div className="eg-main-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <Header
          onOpenMobileMenu={handleOpenMobileMenu}
          guideOpen={guideOpen}
          onToggleGuide={() => setGuide(!guideOpen)}
          onResetDemo={() => setResetOpen(true)}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: '1.5rem',
            maxWidth: '1280px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <ConnectionBanner />
          <NextStepBar />
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      <DemoGuide open={guideOpen} onOpen={() => setGuide(true)} onClose={() => setGuide(false)} />
      {resetOpen && <ResetDemoDialog onClose={() => setResetOpen(false)} />}

      <style>{`
        @media (min-width: 768px) {
          .eg-main-wrapper {
            margin-left: var(--sidebar-width);
          }
        }
      `}</style>
    </div>
  );
};
