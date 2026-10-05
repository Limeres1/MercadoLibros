import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, Search, ScanBarcode, ShoppingCart, Heart, 
  User, ShieldCheck, Store, Library, PackageCheck, 
  LogOut, LogIn, ChevronDown, Check, Sparkles, BookMarked
} from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    currentRole, 
    activeView, 
    setActiveView, 
    cartCount, 
    favorites, 
    setIsCartOpen, 
    setIsBarcodeModalOpen, 
    setIsAuthModalOpen, 
    setAuthModalTab, 
    setIsProfileModalOpen, 
    logoutUser, 
    switchDemoRole,
    searchQuery,
    setSearchQuery,
    reports
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Quick Role Switcher Banner for Seamless Testing of RF-1 to RF-32 */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-400">Modo de simulación (RF-1):</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-semibold uppercase tracking-wider text-[10px]">
            {currentRole === 'admin' ? '🛡️ Administrador' :
             currentRole === 'seller' ? '💼 Vendedor Registrado' :
             currentRole === 'buyer' ? '🛍️ Comprador Registrado' : '👤 Visitante (No registrado)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 hidden sm:inline text-[11px]">Cambiar rol de prueba:</span>
          <div className="inline-flex rounded-md shadow-xs bg-slate-800 p-0.5">
            <button
              onClick={() => switchDemoRole('visitor')}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                currentRole === 'visitor' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Explora como visitante sin iniciar sesión"
            >
              Visitante
            </button>
            <button
              onClick={() => switchDemoRole('buyer')}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                currentRole === 'buyer' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Comprador: Sofía Ramos (Biblioteca, Carrito, Reseñas)"
            >
              Comprador
            </button>
            <button
              onClick={() => switchDemoRole('seller')}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                currentRole === 'seller' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Vendedor: Clara Méndez - Librería Atenea (Ventas, Publicar)"
            >
              Vendedor
            </button>
            <button
              onClick={() => switchDemoRole('admin')}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                currentRole === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Administrador: Joaquín Limeres (Moderación, Usuarios)"
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveView('catalog')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors">
                Mercado <span className="text-amber-600">Libros</span>
              </span>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold hidden sm:block">
                Ecosistema Digital de Lectura
              </p>
            </div>
          </div>

          {/* Search Bar & Barcode Scanner Button (RF-8 & RF-9) */}
          <div className="flex-1 max-w-lg mx-2 hidden md:block">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por título, autor o género..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-full text-sm text-slate-800 transition-all outline-none"
              />
              <button
                onClick={() => setIsBarcodeModalOpen(true)}
                className="absolute right-1.5 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-amber-700 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-full transition-all shadow-2xs"
                title="Escanear código de barras / ISBN"
              >
                <ScanBarcode className="w-3.5 h-3.5 text-amber-600" />
                <span>ISBN</span>
              </button>
            </div>
          </div>

          {/* Navigation Links based on role (RF-1) */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-700">
            <button
              onClick={() => setActiveView('catalog')}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeView === 'catalog' ? 'text-amber-700 bg-amber-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>Catálogo</span>
            </button>

            {/* Buyer Links */}
            {currentUser && (
              <>
                <button
                  onClick={() => setActiveView('library')}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeView === 'library' ? 'text-amber-700 bg-amber-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  <span>Mi Biblioteca</span>
                </button>
                <button
                  onClick={() => setActiveView('orders')}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeView === 'orders' ? 'text-amber-700 bg-amber-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Mis Pedidos</span>
                </button>
              </>
            )}

            {/* Seller Link (RF-26 to RF-30) */}
            {(currentRole === 'seller' || currentRole === 'admin') && (
              <button
                onClick={() => setActiveView('seller')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeView === 'seller' ? 'text-amber-700 bg-amber-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Panel Vendedor</span>
              </button>
            )}

            {/* Admin Link (RF-31, RF-32) */}
            {currentRole === 'admin' && (
              <button
                onClick={() => setActiveView('admin')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 relative ${
                  activeView === 'admin' ? 'text-amber-700 bg-amber-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-red-600" />
                <span>Administración</span>
                {pendingReportsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1 animate-ping"></span>
                )}
              </button>
            )}
          </nav>

          {/* Action Icons: Mobile Barcode, Favorites, Cart, User Profile */}
          <div className="flex items-center gap-2">
            
            {/* Mobile Barcode Scanner icon */}
            <button
              onClick={() => setIsBarcodeModalOpen(true)}
              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
              title="Escanear código de barras"
            >
              <ScanBarcode className="w-5 h-5" />
            </button>

            {/* Favorites Icon (RF-16) */}
            <button
              onClick={() => setActiveView('favorites')}
              className={`p-2 rounded-lg relative transition-colors ${
                activeView === 'favorites' ? 'text-rose-600 bg-rose-50' : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100'
              }`}
              title="Mis Libros Favoritos"
            >
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Cart Icon (RF-17) */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg relative transition-colors"
              title="Carrito de Compras"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile or Login Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors"
                >
                  <img
                    src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={currentUser.displayName}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-500/30"
                  />
                  <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                    {currentUser.displayName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
                        Rol: {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'seller' ? 'Vendedor' : 'Comprador'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsProfileModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium">Editar mi perfil (RF-5)</p>
                          <p className="text-[11px] text-slate-400">Mis 4 libros favoritos (RF-6)</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveView('library');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      >
                        <Library className="w-4 h-4 text-slate-400" />
                        <span>Mi Biblioteca de lectura</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveView('orders');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      >
                        <PackageCheck className="w-4 h-4 text-slate-400" />
                        <span>Historial de pedidos</span>
                      </button>

                      {(currentRole === 'seller' || currentRole === 'admin') && (
                        <button
                          onClick={() => {
                            setActiveView('seller');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                        >
                          <Store className="w-4 h-4 text-emerald-600" />
                          <span>Panel de Vendedor</span>
                        </button>
                      )}

                      {currentRole === 'admin' && (
                        <button
                          onClick={() => {
                            setActiveView('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                        >
                          <ShieldCheck className="w-4 h-4 text-red-600" />
                          <span>Panel de Moderación Admin</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          logoutUser();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalTab('login');
                  setIsAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}

          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="py-2.5 md:hidden border-t border-slate-100">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar título, autor o género..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-1.5 bg-slate-100 focus:bg-white border border-slate-200 rounded-full text-xs text-slate-800 outline-none"
            />
          </div>
        </div>

      </div>
    </header>
  );
};
