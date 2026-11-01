import React, { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { LoaderCircle, Sparkles } from 'lucide-react';

import { API_ROUTES } from '@/constants/api';
import { paths } from '@/constants/routes';
import { useSession } from '@/features/auth/SessionProvider';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { BookFormat } from '@/features/catalog/BookCard';
import { useBooksByIds } from '@/features/catalog/BooksProvider';
import { formatPrice } from '@/lib/format';
import { API_ERRORS, ApiError, postApi } from '@/services/api';

const REQUEST_MAX_LENGTH = 500;
const EXAMPLES = [
  'Una novela corta para leer en un viaje',
  'Algo de misterio con buen ritmo',
  'Poesía latinoamericana',
];

interface Recommendation {
  bookId: string;
  reason: string;
}

export const BookRecommendations: React.FC = () => {
  const { currentUser } = useSession();
  const requireLogin = useRequireLogin();
  const [request, setRequest] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { books, isLoading: areBooksLoading } = useBooksByIds(recommendations?.map(item => item.bookId) ?? []);

  const ask = async (text: string) => {
    if (!requireLogin('Iniciá sesión para pedir recomendaciones al asistente.')) return;
    if (isAsking || text.trim().length < 3) return;
    setIsAsking(true);
    setError(null);
    setRecommendations(null);
    try {
      const response = await postApi<{ recommendations: Recommendation[] }>(API_ROUTES.recommendations, {
        request: text.trim(),
      });
      setRecommendations(response.recommendations);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : API_ERRORS.unknown);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(request);
  };

  const shown = (recommendations ?? [])
    .map(item => ({ ...item, book: books.find(book => book.id === item.bookId) }))
    .filter(item => item.book);

  return (
    <section
      aria-labelledby="book-recommendations-title"
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-violet-100 p-2 text-violet-700">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="book-recommendations-title" className="font-bold text-slate-900">
            ¿Qué querés leer?
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Contale al asistente qué buscás y te recomienda hasta 3 libros del catálogo.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="book-recommendation-request" className="sr-only">
          Qué te gustaría leer
        </label>
        <input
          id="book-recommendation-request"
          value={request}
          onChange={event => setRequest(event.target.value)}
          maxLength={REQUEST_MAX_LENGTH}
          placeholder="Ej.: una novela breve de misterio, con buen ritmo"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <button
          type="submit"
          disabled={isAsking || (Boolean(currentUser) && request.trim().length < 3)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAsking ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {isAsking ? 'Buscando…' : currentUser ? 'Recomendarme' : 'Ingresá para pedir'}
        </button>
      </form>

      {!recommendations && !isAsking && !error && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setRequest(example);
                ask(example);
              }}
              className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs text-violet-800 hover:border-violet-400"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error} Mientras tanto, podés seguir explorando el catálogo.
          </p>
        )}

        {recommendations && recommendations.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">
            No encontramos libros que encajen con ese pedido. Probá describirlo de otra manera.
          </p>
        )}

        {recommendations && recommendations.length > 0 && areBooksLoading && shown.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Cargando las recomendaciones…</p>
        )}

        {shown.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {shown.map(({ book, reason }) =>
              book ? (
                <li key={book.id}>
                  <Link
                    to={paths.book(book.id)}
                    className="flex h-full gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-violet-300 focus-visible:outline-2 focus-visible:outline-violet-700"
                  >
                    <img src={book.coverUrl} alt="" className="h-24 w-16 shrink-0 rounded object-cover" />
                    <span className="min-w-0">
                      <span className="block font-serif font-semibold leading-snug text-slate-900">{book.title}</span>
                      <span className="block text-xs text-slate-500">{book.author}</span>
                      <BookFormat book={book} className="mt-1 text-xs" />
                      <span className="mt-1.5 block text-sm text-slate-700">{reason}</span>
                      <span className="mt-1 block text-sm font-bold tabular-nums text-slate-900">
                        {formatPrice(book.price)}
                      </span>
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>
    </section>
  );
};
