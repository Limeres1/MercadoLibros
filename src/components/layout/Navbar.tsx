import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router';
import {
  BookOpen, Search, ScanBarcode, ShoppingCart, Heart,
  User, ShieldCheck, Store, Library, PackageCheck,
  LogOut, LogIn, ChevronDown, BookMarked
} from 'lucide-react';
import { UserRole } from '../../types';
import { useSession } from '../../features/auth/SessionProvider';
import { useAuthModal } from '../../features/auth/AuthModalProvider';
import { useFavorites } from '../../features/catalog/favorites/FavoritesProvider';
import { useReports } from '../../features/catalog/reports/ReportsProvider';
import { BarcodeScannerModal } from '../../features/catalog/BarcodeScannerModal';
import { useCart } from '../../features/shop/CartProvider';
import { ROUTES, SEARCH_PARAM, paths } from '../../constants/routes';

const DEMO_ROLES: { role: UserRole; label: string }[] = [
  { role: 'visitor', label: 'Visitante' },
  { role: 'buyer', label: 'Comprador' },
  { role: 'seller', label: 'Vendedor' },
  { role: 'admin', label: 'Admin' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '🛡️ Administrador',
  seller: '💼 Vendedor Registrado',
  buyer: '🛍️ Comprador Registrado',
  visitor: '👤 Visitante (No registrado)',
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 relative ${
    isActive ? 'text-amber-700 bg-amber-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-100'
  }`;

const menuItemClass = 'w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5';

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, logoutUser, switchDemoRole } = useSession();
  const { openAuth } = useAuthModal();
  const { favorites } = useFavorites();
  const { reports } = useReports();
  const { cartCount, openCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const searchQuery = searchParams.get(SEARCH_PARAM) ?? '';
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const isSellerOrAdmin = currentRole === 'seller' || currentRole === 'admin';

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isUserMenuOpen]);

  const handleSearch = (value: string) => {
    navigate(paths.home(value), { replace: true });
  };

  const goTo = (path: string) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
          <span className="font-medium text-slate-400">Modo de simulación:</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-semibold uppercase tracking-wider text-[10px]">
            {ROLE_LABELS[currentRole]}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 hidden sm:inline text-[11px]">Cambiar rol de prueba:</span>
          <div className="inline-flex rounded-md shadow-xs bg-slate-800 p-0.5">
            {DEMO_ROLES.map(({ role, label }) => (
              <button
                key={role}
                onClick={() => switchDemoRole(role)}
                className={`px-2 py-0.5 text-xs rounded transition-all ${
                  currentRole === role ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">

          <Link to={ROUTES.home} className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors">
                Mercado <span className="text-amber-600">Libros</span>
              </span>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold hidden sm:block">
                Ecosistema Digital de Lectura
              </p>
            </div>
          </Link>

          <div className="flex-1 max-w-lg mx-2 hidden md:block">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar libros"
                placeholder="Buscar por título, autor o género..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-10 pr-24 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-full text-sm text-slate-800 transition-all outline-none"
              />
              <button
                onClick={() => setIsScannerOpen(true)}
                className="absolute right-1.5 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-amber-700 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-full transition-all shadow-2xs"
                aria-label="Escanear código de barras o ISBN"
              >
                <ScanBarcode className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span>ISBN</span>
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-700" aria-label="Principal">
            <NavLink to={ROUTES.home} end className={navLinkClass}>
              <BookMarked className="w-4 h-4" aria-hidden="true" />
              <span>Catálogo</span>
            </NavLink>

            {currentUser && (
              <>
                <NavLink to={ROUTES.library} className={navLinkClass}>
                  <Library className="w-4 h-4" aria-hidden="true" />
                  <span>Mi Biblioteca</span>
                </NavLink>
                <NavLink to={ROUTES.orders} className={navLinkClass}>
                  <PackageCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Mis Pedidos</span>
                </NavLink>
              </>
            )}

            {isSellerOrAdmin && (
              <NavLink to={ROUTES.seller} className={navLinkClass}>
                <Store className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>Panel Vendedor</span>
              </NavLink>
            )}

            {currentRole === 'admin' && (
              <NavLink to={ROUTES.admin} className={navLinkClass}>
                <ShieldCheck className="w-4 h-4 text-red-600" aria-hidden="true" />
                <span>Administración</span>
                {pendingReportsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1 animate-ping" aria-label="Denuncias pendientes"></span>
                )}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
              aria-label="Escanear código de barras"
            >
              <ScanBarcode className="w-5 h-5" aria-hidden="true" />
            </button>

            <NavLink
              to={ROUTES.favorites}
              className={({ isActive }) =>
                `p-2 rounded-lg relative transition-colors ${
                  isActive ? 'text-rose-600 bg-rose-50' : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100'
                }`
              }
              aria-label="Mis libros favoritos"
            >
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </NavLink>

            <button
              onClick={openCart}
              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg relative transition-colors"
              aria-label={`Carrito de compras (${cartCount})`}
            >
              <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(open => !open)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors"
                >
                  <img
                    src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-500/30"
                  />
                  <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                    {currentUser.displayName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" aria-hidden="true" />
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
                        Rol: {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'seller' ? 'Vendedor' : 'Comprador'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button role="menuitem" onClick={() => goTo(ROUTES.profile)} className={menuItemClass}>
                        <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <div>
                          <p className="font-medium">Mi perfil</p>
                          <p className="text-[11px] text-slate-500">Datos y mis 4 libros favoritos</p>
                        </div>
                      </button>
                      <button role="menuitem" onClick={() => goTo(ROUTES.library)} className={menuItemClass}>
                        <Library className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <span>Mi Biblioteca de lectura</span>
                      </button>
                      <button role="menuitem" onClick={() => goTo(ROUTES.orders)} className={menuItemClass}>
                        <PackageCheck className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <span>Historial de pedidos</span>
                      </button>
                      {isSellerOrAdmin && (
                        <button role="menuitem" onClick={() => goTo(ROUTES.seller)} className={menuItemClass}>
                          <Store className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                          <span>Panel de Vendedor</span>
                        </button>
                      )}
                      {currentRole === 'admin' && (
                        <button role="menuitem" onClick={() => goTo(ROUTES.admin)} className={menuItemClass}>
                          <ShieldCheck className="w-4 h-4 text-red-600" aria-hidden="true" />
                          <span>Panel de Moderación Admin</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logoutUser();
                          navigate(ROUTES.home);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuth('login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ingresar</span>
              </button>
            )}
          </div>
        </div>

        <div className="py-2.5 md:hidden border-t border-slate-100">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar libros"
              placeholder="Buscar título, autor o género..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-10 py-1.5 bg-slate-100 focus:bg-white border border-slate-200 rounded-full text-sm text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      {isScannerOpen && <BarcodeScannerModal onClose={() => setIsScannerOpen(false)} />}
    </header>
  );
};
