import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { CatalogView } from './components/CatalogView';
import { LibraryView } from './components/LibraryView';
import { OrdersView } from './components/OrdersView';
import { SellerDashboard } from './components/SellerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { FavoritesView } from './components/FavoritesView';
import { BookDetailModal } from './components/BookDetailModal';
import { SampleReaderModal } from './components/SampleReaderModal';
import { BookReaderModal } from './components/BookReaderModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import { ProfileModal } from './components/ProfileModal';
import { CreateBookModal } from './components/CreateBookModal';
import { ReportModal } from './components/ReportModal';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';
import { BookOpen, ShieldCheck, Heart, Sparkles } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'catalog' && <CatalogView />}
        {activeView === 'library' && <LibraryView />}
        {activeView === 'orders' && <OrdersView />}
        {activeView === 'seller' && <SellerDashboard />}
        {activeView === 'admin' && <AdminDashboard />}
        {activeView === 'favorites' && <FavoritesView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 mt-16 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Mercado Libros</p>
              <p className="text-[11px] text-slate-400">Ecosistema digital de comercio, lectura y gestión literaria</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-500 font-medium">
            <span>Cumplimiento integral RF-1 al RF-32</span>
            <span>•</span>
            <span>Firebase Firestore & Auth</span>
            <span>•</span>
            <span>Lector In-App Digital</span>
            <span>•</span>
            <span>Escáner ISBN</span>
          </div>

          <p className="text-slate-400 text-[11px]">
            © {new Date().getFullYear()} Mercado Libros. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* All Application Modals */}
      <BookDetailModal />
      <SampleReaderModal />
      <BookReaderModal />
      <BarcodeScannerModal />
      <CartCheckoutModal />
      <ProfileModal />
      <CreateBookModal />
      <ReportModal />
      <AuthModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
