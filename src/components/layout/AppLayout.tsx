import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { PageLoader } from '../ui/PageLoader';
import { AuthModal } from '../../features/auth/AuthModal';
import { CartCheckoutModal } from '../../features/shop/CartCheckoutModal';

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <AuthModal />
      <CartCheckoutModal />
    </div>
  );
};
