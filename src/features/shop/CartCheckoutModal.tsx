import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Trash2, Plus, Minus, ShoppingBag, CreditCard, CheckCircle, ArrowRight, ShieldCheck, Truck, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ROUTES } from '../../constants/routes';
import { Modal } from '../../components/ui/Modal';
import { useSession } from '../auth/SessionProvider';
import { useAuthModal } from '../auth/AuthModalProvider';
import { useCart } from './CartProvider';
import { useCheckout } from './useCheckout';

export const CartCheckoutModal: React.FC = () => {
  const { isCartOpen } = useCart();
  return isCartOpen ? <CartCheckoutDialog /> : null;
};

const CartCheckoutDialog: React.FC = () => {
  const { cart, cartTotal, closeCart, removeFromCart, updateCartQuantity, clearCart } = useCart();
  const { completeCheckout } = useCheckout();
  const { currentUser } = useSession();
  const { openAuth } = useAuthModal();
  const navigate = useNavigate();

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'mercadopago' | 'transfer'>('mercadopago');
  const [shippingAddress, setShippingAddress] = useState(currentUser?.location || 'Av. Corrientes 1240, CABA');
  const [isProcessing, setIsProcessing] = useState(false);

  const hasPhysicalBooks = cart.some(item => item.book.condition !== 'digital');
  const shippingCost = hasPhysicalBooks ? 4.50 : 0.00;
  const finalTotal = cartTotal + shippingCost;

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      openAuth('login');
      return;
    }
    setStep('checkout');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const methodLabels = {
      credit_card: 'Tarjeta de Crédito / Débito (Visa •••• 4242)',
      mercadopago: 'Mercado Pago (Aprobación Inmediata)',
      transfer: 'Transferencia Bancaria Inmediata'
    };

    setTimeout(async () => {
      const success = await completeCheckout(methodLabels[paymentMethod], hasPhysicalBooks ? shippingAddress : 'Entrega Digital');
      setIsProcessing(false);
      if (success) {
        setStep('success');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }, 900);
  };

  const handleClose = closeCart;

  const goTo = (path: string) => {
    closeCart();
    navigate(path);
  };

  return (
    <Modal onClose={handleClose} labelledBy="cart-title">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cart-title" className="font-bold text-slate-900 text-base">
                {step === 'cart' ? 'Carrito de Compras' :
                 step === 'checkout' ? 'Confirmar Compra y Pago' : '¡Compra Exitosa!'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'cart' ? `${cart.length} títulos seleccionados` : 'Transacción protegida'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Tu carrito de compras está vacío</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Explora el catálogo de obras y agrega tus libros favoritos para adquirirlos.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Ver Catálogo de Libros
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div 
                      key={item.book.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80"
                    >
                      <img
                        src={item.book.coverUrl}
                        alt={item.book.title}
                        className="w-12 h-16 object-cover rounded-lg shadow-2xs border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.book.condition === 'digital' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.book.condition}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 truncate">{item.book.title}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{item.book.author}</p>
                        <p className="text-xs font-black text-slate-900 mt-1">
                          ${(item.book.price * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            onClick={() => updateCartQuantity(item.book.id, item.quantity - 1)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold px-1.5 min-w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.book.id, item.quantity + 1)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.book.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Eliminar del carrito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 flex justify-between items-center text-xs">
                    <button
                      onClick={clearCart}
                      className="text-slate-400 hover:text-rose-600 font-medium"
                    >
                      Vaciar carrito
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form onSubmit={handlePay} className="space-y-5">
              
              {hasPhysicalBooks && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>Dirección de Envío Domiciliario</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Calle, número, ciudad, código postal"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">Despacho garantizado dentro de las 48hs hábiles.</p>
                </div>
              )}

              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Selecciona tu Medio de Pago
                </label>
                
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'mercadopago'}
                      onChange={() => setPaymentMethod('mercadopago')}
                      className="accent-amber-600"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-xs text-slate-900">Mercado Pago</p>
                      <p className="text-[11px] text-slate-500">Saldo en cuenta, débito o cuotas</p>
                    </div>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">Rápido</span>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'credit_card' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'credit_card'}
                      onChange={() => setPaymentMethod('credit_card')}
                      className="accent-amber-600"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-xs text-slate-900">Tarjeta de Crédito / Débito</p>
                      <p className="text-[11px] text-slate-500">Visa, Mastercard, American Express</p>
                    </div>
                    <CreditCard className="w-4 h-4 text-slate-400" />
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'transfer' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'transfer'}
                      onChange={() => setPaymentMethod('transfer')}
                      className="accent-amber-600"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-xs text-slate-900">Transferencia Bancaria Inmediata</p>
                      <p className="text-[11px] text-slate-500">Acreditación instantánea</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pago encriptado con certificación SSL y custodia de Mercado Libros.</span>
              </div>

            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle className="w-10 h-10 animate-in zoom-in-75 duration-300" />
              </div>
              <h4 className="text-xl font-extrabold text-slate-900">¡Pago y Pedido Confirmados!</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Tus libros han sido añadidos automáticamente a tu <strong className="text-slate-900">Biblioteca Personal</strong> y puedes comenzar a leerlos ahora mismo.
              </p>
              
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <button
                  onClick={() => goTo(ROUTES.library)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ir a mi Biblioteca y Leer</span>
                </button>

                <button
                  onClick={() => goTo(ROUTES.orders)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  Ver Historial de Pedidos
                </button>
              </div>
            </div>
          )}

        </div>

        {step !== 'success' && cart.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} libros):</span>
                <span className="font-semibold text-slate-800">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío {hasPhysicalBooks ? 'a domicilio' : 'digital'}:</span>
                <span className="font-semibold text-slate-800">
                  {hasPhysicalBooks ? `$${shippingCost.toFixed(2)}` : 'Gratis'}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                <span>Total a Pagar:</span>
                <span className="text-amber-700">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                onClick={handleProceedToCheckout}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/25 flex items-center justify-center gap-2 transition-all"
              >
                <span>Continuar a la Compra</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Procesando pago...</span>
                  ) : (
                    <>
                      <span>Pagar ${finalTotal.toFixed(2)}</span>
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

    </Modal>
  );
};
