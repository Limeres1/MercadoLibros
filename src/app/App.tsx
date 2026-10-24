import { BrowserRouter, Route, Routes } from 'react-router';
import { AppProviders } from './AppProviders';
import { AppLayout } from '../components/layout/AppLayout';
import { NotFoundPage } from '../components/layout/NotFoundPage';
import { RequireRole } from '../features/auth/RequireRole';
import { ProfilePage } from '../features/auth/ProfilePage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { BookDetailPage } from '../features/catalog/BookDetailPage';
import { FavoritesPage } from '../features/catalog/favorites/FavoritesPage';
import { LibraryPage } from '../features/reader/LibraryPage';
import { ReaderPage } from '../features/reader/ReaderPage';
import { OrdersPage } from '../features/shop/OrdersPage';
import { SellerDashboard } from '../features/seller/SellerDashboard';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { ROUTES } from '../constants/routes';

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<CatalogPage />} />
            <Route path={ROUTES.book} element={<BookDetailPage />} />
            <Route path={ROUTES.favorites} element={<RequireRole><FavoritesPage /></RequireRole>} />
            <Route path={ROUTES.library} element={<RequireRole><LibraryPage /></RequireRole>} />
            <Route path={ROUTES.orders} element={<RequireRole><OrdersPage /></RequireRole>} />
            <Route path={ROUTES.profile} element={<RequireRole><ProfilePage /></RequireRole>} />
            <Route path={ROUTES.seller} element={<RequireRole roles={['seller', 'admin']}><SellerDashboard /></RequireRole>} />
            <Route path={ROUTES.admin} element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
            <Route path={ROUTES.reader} element={<RequireRole><ReaderPage /></RequireRole>} />
            <Route path={ROUTES.notFound} element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
