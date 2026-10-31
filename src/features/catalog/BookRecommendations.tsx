import React, { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, LoaderCircle, Sparkles } from 'lucide-react';

import { paths } from '@/constants/routes';
import {
  BookRecommendation,
  buildRecommendationPrompt,
  parseBookRecommendations,
} from '@/features/catalog/recommendations';
import { useAI } from '@/hooks/useAI';
import { Book } from '@/types';

interface BookRecommendationsProps {
  books: Book[];
  isCatalogLoading: boolean;
  catalogError: string | null;
}

const SYSTEM_INSTRUCTION =
  'Sos un librero que recomienda libros con calidez y brevedad. El catálogo contiene tuplas [id, título, autor, género, idioma, formato, precio, descripción]. Usa exclusivamente IDs que aparezcan en el catálogo recibido; nunca inventes libros ni IDs. Recomienda como máximo 3 libros y explica en una frase por qué encaja cada uno. Responde sólo JSON válido con esta forma: {"recommendations":[{"bookId":"ID existente","reason":"Motivo breve"}]}. Si ninguno encaja, devuelve {"recommendations":[]}.';

export const BookRecommendations: React.FC<BookRecommendationsProps> = ({ books, isCatalogLoading, catalogError }) => {
  const { ask, isLoading, error, resetError } = useAI();
  const [request, setRequest] = useState('');
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [responseError, setResponseError] = useState<string | null>(null);
  const publishedBooks = books.filter(book => book.status === 'published');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoading || !request.trim() || isCatalogLoading || catalogError || publishedBooks.length === 0) return;
    resetError();
    setResponseError(null);
    setRecommendations([]);

    try {
      const prompt = buildRecommendationPrompt(request, publishedBooks);
      const answer = await ask({ prompt, systemInstruction: SYSTEM_INSTRUCTION, json: true });
      if (!answer) return;
      const results = parseBookRecommendations(answer, publishedBooks);
      setRecommendations(results);
      if (results.length === 0)
        setResponseError('No encontramos una recomendación adecuada. Probá describirlo de otra manera.');
    } catch (caught) {
      setResponseError(
        caught instanceof Error ? caught.message : 'No pudimos preparar las recomendaciones. Probá de nuevo más tarde.',
      );
    }
  };

  return (
    <section
      aria-labelledby="book-recommendations-title"
      className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-violet-100 p-2 text-violet-700">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="book-recommendations-title" className="font-bold text-slate-900">
            ¿Qué querés leer?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Contanos qué tenés ganas de leer y te recomendamos libros del catálogo.
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
          maxLength={500}
          required
          placeholder="Ej.: una novela breve de misterio, con buen ritmo"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <button
          type="submit"
          disabled={isLoading || isCatalogLoading || Boolean(catalogError) || publishedBooks.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading || isCatalogLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {isCatalogLoading ? 'Cargando catálogo…' : isLoading ? 'Buscando…' : 'Recomendarme'}
        </button>
      </form>

      {(error || catalogError || responseError) && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error || catalogError || responseError} El catálogo sigue disponible para explorar.
        </p>
      )}

      {!isCatalogLoading && !catalogError && publishedBooks.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">Todavía no hay libros publicados para recomendar.</p>
      )}

      {recommendations.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {recommendations.map(({ book, reason }) => (
            <li key={book.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Link
                to={paths.book(book.id)}
                className="flex items-start gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-violet-700"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
                <span>
                  <span className="block font-semibold text-slate-900 hover:text-violet-800">{book.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{book.author}</span>
                  <span className="mt-2 block text-sm text-slate-700">{reason}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
