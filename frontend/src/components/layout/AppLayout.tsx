import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ConnectionBanner } from './ConnectionBanner';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleOpenMobileMenu = () => setMobileOpen(true);
  const handleCloseMobileMenu = () => setMobileOpen(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Persistent Left Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={handleCloseMobileMenu} />

      {/* Main Wrapper Offset for Desktop Sidebar */}
      <div className="eg-main-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <Header onOpenMobileMenu={handleOpenMobileMenu} />

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
          <Outlet />
        </main>
      </div>

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
