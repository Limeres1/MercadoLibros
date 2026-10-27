import { BrowserRouter, Route, Routes } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { ROUTES } from '@/constants/routes';
import { RequireRole } from '@/features/auth/RequireRole';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { lazyPage } from '@/lib/lazyPage';

const BookDetailPage = lazyPage(() => import('@/features/catalog/BookDetailPage'), 'BookDetailPage');
const FavoritesPage = lazyPage(() => import('@/features/catalog/favorites/FavoritesPage'), 'FavoritesPage');
const ProfilePage = lazyPage(() => import('@/features/auth/ProfilePage'), 'ProfilePage');
const LibraryPage = lazyPage(() => import('@/features/reader/LibraryPage'), 'LibraryPage');
const ReaderPage = lazyPage(() => import('@/features/reader/ReaderPage'), 'ReaderPage');
const OrdersPage = lazyPage(() => import('@/features/shop/OrdersPage'), 'OrdersPage');
const PaymentSimulationPage = lazyPage(() => import('@/features/shop/PaymentSimulationPage'), 'PaymentSimulationPage');
const SellerDashboard = lazyPage(() => import('@/features/seller/SellerDashboard'), 'SellerDashboard');
const AdminDashboard = lazyPage(() => import('@/features/admin/AdminDashboard'), 'AdminDashboard');

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<CatalogPage />} />
            <Route path={ROUTES.book} element={<BookDetailPage />} />
            <Route
              path={ROUTES.favorites}
              element={
                <RequireRole>
                  <FavoritesPage />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.library}
              element={
                <RequireRole>
                  <LibraryPage />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.orders}
              element={
                <RequireRole>
                  <OrdersPage />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.paymentSimulation}
              element={
                <RequireRole>
                  <PaymentSimulationPage />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.profile}
              element={
                <RequireRole>
                  <ProfilePage />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.seller}
              element={
                <RequireRole roles={['seller', 'admin']}>
                  <SellerDashboard />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.admin}
              element={
                <RequireRole roles={['admin']}>
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.reader}
              element={
                <RequireRole>
                  <ReaderPage />
                </RequireRole>
              }
            />
            <Route path={ROUTES.notFound} element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
