const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatPrice = (amount: number) => priceFormatter.format(amount);

const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDate = (isoDate: string) => dateFormatter.format(new Date(isoDate));

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export const formatDateTime = (isoDate: string) => dateTimeFormatter.format(new Date(isoDate));

export const formatRating = (rating: number) => rating.toFixed(1);

export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
