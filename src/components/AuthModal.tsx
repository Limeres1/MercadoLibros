import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, LogIn, UserPlus, KeyRound, Mail, Lock, 
  User, Store, ShoppingBag, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalTab, 
    setAuthModalTab, 
    loginWithEmail, 
    registerWithEmail, 
    sendPasswordReset, 
    switchDemoRole,
    showToast 
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }
    setIsSubmitting(true);
    await loginWithEmail(email, password);
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }
    setIsSubmitting(true);
    await registerWithEmail(email, password, displayName, selectedRole);
    setIsSubmitting(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Por favor ingresa tu correo electrónico', 'error');
      return;
    }
    setIsSubmitting(true);
    await sendPasswordReset(email);
    setIsSubmitting(false);
    setAuthModalTab('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 text-xs font-bold">
          <button
            onClick={() => setAuthModalTab('login')}
            className={`flex-1 py-4 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              authModalTab === 'login' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión (RF-3)</span>
          </button>

          <button
            onClick={() => setAuthModalTab('register')}
            className={`flex-1 py-4 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              authModalTab === 'register' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registro (RF-2)</span>
          </button>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-3 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* TAB 1: LOGIN (RF-3) */}
          {authModalTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@mercadolibros.com"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setAuthModalTab('forgot')}
                    className="text-[11px] text-amber-700 hover:underline"
                  >
                    ¿Olvidaste tu contraseña? (RF-4)
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Entrar a mi Cuenta'}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER (RF-2) */}
          {authModalTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selector (RF-2: Comprador o Vendedor) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Tipo de Cuenta (RF-2)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedRole === 'buyer' 
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 text-slate-900' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-xs">Comprador</span>
                    <span className="text-[10px] text-slate-400">Comprar y leer libros</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('seller')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedRole === 'seller' 
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-slate-900' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs">Vendedor</span>
                    <span className="text-[10px] text-slate-400">Publicar y vender</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej: Laura Pérez"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
              >
                {isSubmitting ? 'Creando cuenta...' : `Crear Cuenta de ${selectedRole === 'seller' ? 'Vendedor' : 'Comprador'}`}
              </button>
            </form>
          )}

          {/* TAB 3: PASSWORD RECOVERY (RF-4) */}
          {authModalTab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 text-amber-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Restablecer Contraseña (RF-4)</h4>
                <p className="text-xs text-slate-500">
                  Ingresa tu correo y te enviaremos el enlace de recuperación vía Firebase.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthModalTab('login')}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Correo de Recuperación'}
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Accounts Fast Switcher */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 text-center">
              Acceso Rápido con Cuentas Demo
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchDemoRole('buyer');
                  setIsAuthModalOpen(false);
                }}
                className="p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-center transition-colors"
              >
                <span className="block font-bold text-[11px] text-slate-800">Comprador</span>
                <span className="text-[9px] text-slate-400">Sofía Ramos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('seller');
                  setIsAuthModalOpen(false);
                }}
                className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-center transition-colors"
              >
                <span className="block font-bold text-[11px] text-slate-800">Vendedor</span>
                <span className="text-[9px] text-slate-400">Librería Atenea</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('admin');
                  setIsAuthModalOpen(false);
                }}
                className="p-2 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-xl text-center transition-colors"
              >
                <span className="block font-bold text-[11px] text-slate-800">Admin</span>
                <span className="text-[9px] text-slate-400">Joaquín Limeres</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
