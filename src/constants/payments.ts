export const PAYMENT_OPTIONS = {
  card: {
    label: 'Tarjeta de crédito o débito',
    description: 'Visa, Mastercard, American Express y otras.',
    excludedTypes: ['ticket', 'atm'],
  },
  account: {
    label: 'Dinero en cuenta de Mercado Pago',
    description: 'Pagás con el saldo de tu cuenta de Mercado Pago.',
    excludedTypes: ['credit_card', 'debit_card', 'prepaid_card', 'ticket', 'atm'],
  },
  cash: {
    label: 'Efectivo en Rapipago o Pago Fácil',
    description: 'Recibís un código para pagar en un local. Los libros llegan cuando se acredita el pago.',
    excludedTypes: ['credit_card', 'debit_card', 'prepaid_card'],
  },
} as const;

export type PaymentOption = keyof typeof PAYMENT_OPTIONS;

export const DEFAULT_PAYMENT_OPTION: PaymentOption = 'card';

export const isPaymentOption = (value: unknown): value is PaymentOption =>
  typeof value === 'string' && value in PAYMENT_OPTIONS;

export const PAYMENT_SYNC_INTERVAL_MS = 5000;
