import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Lock, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { DEFAULT_PAYMENT_OPTION, PAYMENT_OPTIONS, PaymentOption } from '@/constants/payments';
import { BOOK_CONDITION_LABELS, SHIPPING_COST } from '@/constants/statuses';
import { useAuthModal } from '@/features/auth/AuthModalProvider';
import { useSession } from '@/features/auth/SessionProvider';
import { AddressPicker, formatShippingAddress, ShippingAddress } from '@/features/shop/AddressPicker';
import { getMaxQuantity, useCart } from '@/features/shop/CartProvider';
import { useOrders } from '@/features/shop/OrdersProvider';
import { useCheckout } from '@/features/shop/useCheckout';
import { formatPrice } from '@/lib/format';

export const CartCheckoutModal: React.FC = () => {
  const { isCartOpen } = useCart();
  return isCartOpen ? <CartCheckoutDialog /> : null;
};

const CartCheckoutDialog: React.FC = () => {
  const { cart, cartTotal, closeCart, removeFromCart, updateCartQuantity, clearCart } = useCart();
  const { startCheckout, isStarting, error, clearError } = useCheckout();
  const { currentUser } = useSession();
  const { openAuth } = useAuthModal();

  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const { orders } = useOrders();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(() => ({
    street: orders.find(order => order.shippingAddress)?.shippingAddress ?? '',
    details: '',
    location: null,
  }));
  const [paymentOption, setPaymentOption] = useState<PaymentOption>(DEFAULT_PAYMENT_OPTION);

  const hasPhysicalBooks = cart.some(item => item.book.condition !== 'digital');
  const shippingCost = hasPhysicalBooks ? SHIPPING_COST : 0;
  const total = cartTotal + shippingCost;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const goToCheckout = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!currentUser) {
      openAuth('login');
      return;
    }
    clearError();
    setStep('checkout');
  };

  const handlePay = (event: React.FormEvent) => {
    event.preventDefault();
    startCheckout(
      hasPhysicalBooks ? formatShippingAddress(shippingAddress) : '',
      paymentOption,
      hasPhysicalBooks ? shippingAddress.location : null,
    );
  };

  return (
    <Modal onClose={closeCart} labelledBy="cart-title">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          {step === 'checkout' ? (
            <button
              type="button"
              onClick={() => setStep('cart')}
              aria-label="Volver al carrito"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <h2 id="cart-title" className="text-base font-bold text-slate-900">
              {step === 'cart' ? 'Tu carrito' : 'Finalizar compra'}
            </h2>
            <p className="text-xs text-slate-500">
              {itemCount} {itemCount === 1 ? 'libro' : 'libros'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeCart}
          aria-label="Cerrar carrito"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {cart.length === 0 ? (
          <div className="space-y-3 py-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-700">Tu carrito está vacío</p>
            <p className="mx-auto max-w-xs text-xs text-slate-500">Agregá libros desde el catálogo para comprarlos.</p>
            <button
              type="button"
              onClick={closeCart}
              className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Ver el catálogo
            </button>
          </div>
        ) : step === 'cart' ? (
          <ul className="space-y-3">
            {cart.map(item => (
              <li
                key={item.book.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <img src={item.book.coverUrl} alt="" className="h-16 w-12 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.book.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {item.book.author} · {BOOK_CONDITION_LABELS[item.book.condition]}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                    {formatPrice(item.book.price * item.quantity)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {item.book.condition !== 'digital' && (
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.book.id, item.quantity - 1)}
                        aria-label={`Quitar un ejemplar de ${item.book.title}`}
                        className="p-1.5 text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.book.id, item.quantity + 1)}
                        disabled={item.quantity >= getMaxQuantity(item.book)}
                        aria-label={`Sumar un ejemplar de ${item.book.title}`}
                        className="p-1.5 text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.book.id)}
                    aria-label={`Quitar ${item.book.title} del carrito`}
                    className="rounded p-1 text-slate-400 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
            <li>
              <button type="button" onClick={clearCart} className="text-xs text-slate-500 hover:text-red-700">
                Vaciar carrito
              </button>
            </li>
          </ul>
        ) : (
          <form id="checkout-form" onSubmit={handlePay} className="space-y-5">
            {hasPhysicalBooks && <AddressPicker value={shippingAddress} onChange={setShippingAddress} />}

            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {cart.map(item => (
                <li key={item.book.id} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-slate-700">
                    {item.quantity > 1 && `${item.quantity} × `}
                    {item.book.title}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-900">
                    {formatPrice(item.book.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">Medio de pago</legend>
              <div className="mt-2 space-y-2">
                {Object.entries(PAYMENT_OPTIONS).map(([value, option]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                      paymentOption === value
                        ? 'border-sky-600 bg-sky-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-option"
                      value={value}
                      checked={paymentOption === value}
                      onChange={() => setPaymentOption(value as PaymentOption)}
                      className="mt-1 accent-sky-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                      <span className="block text-xs text-slate-500">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs text-slate-700">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              El pago se procesa en Mercado Pago. Cuando se acredita, el pedido se confirma solo y los libros digitales
              aparecen en tu biblioteca.
            </p>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
                {error}
              </p>
            )}
          </form>
        )}
      </div>

      {cart.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50 p-6">
          <dl className="space-y-1.5 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums text-slate-900">{formatPrice(cartTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd className="tabular-nums text-slate-900">{hasPhysicalBooks ? formatPrice(shippingCost) : 'Gratis'}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(total)}</dd>
            </div>
          </dl>

          {step === 'cart' ? (
            <button
              key="continue"
              type="button"
              onClick={goToCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700"
            >
              Continuar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              key="pay"
              type="submit"
              form="checkout-form"
              disabled={isStarting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isStarting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isStarting ? 'Preparando el pago…' : `Continuar a Mercado Pago · ${formatPrice(total)}`}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};
