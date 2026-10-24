import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Footer } from '../common/Footer';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const isExplore = location.pathname.startsWith('/explore');

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!isExplore && <Footer />}
    </div>
  );
};
