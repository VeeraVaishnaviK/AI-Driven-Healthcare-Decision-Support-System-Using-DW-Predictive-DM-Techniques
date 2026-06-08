'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop for mobile sidebar drawer */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 95,
            transition: 'opacity 0.2s'
          }}
        />
      )}

      {/* Main scrolling viewport container */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          marginLeft: '260px', // Matches sidebar width
          minWidth: 0, // Prevents content blowout
          transition: 'margin-left 0.3s ease'
        }}
        className="main-layout-viewport"
      >
        {/* Top Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dashboard page content wrapper */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      {/* CSS layout overrides for mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .main-layout-viewport {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
