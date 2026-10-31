import { describe, expect, it } from 'vitest';

import { buildRecommendationPrompt, parseBookRecommendations } from '@/features/catalog/recommendations';
import { Book } from '@/types';

const book = (id: string, status: Book['status'] = 'published'): Book =>
  ({
    id,
    title: `Libro ${id}`,
    author: 'Autora',
    isbn: '',
    description: 'Descripción',
    price: 10,
    condition: 'digital',
    genre: 'Ficción',
    language: 'Español',
    coverUrl: '',
    sampleText: '',
    sellerId: 'seller',
    sellerName: 'Librería',
    status,
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 100,
    publicationYear: 2020,
    createdAt: '',
    updatedAt: '',
  }) as Book;

describe('parseBookRecommendations', () => {
  it('sends the reader request and only published catalog entries to Gemini', () => {
    const prompt = JSON.parse(
      buildRecommendationPrompt('Una historia de misterio', [book('published-1'), book('draft', 'draft')]),
    );

    expect(prompt.request).toBe('Una historia de misterio');
    expect(prompt.catalog.map((candidate: string[]) => candidate[0])).toEqual(['published-1']);
  });

  it('keeps large catalogs within the prompt limit and prioritizes matching published books', () => {
    const books = Array.from({ length: 200 }, (_item, index) => {
      const entry = book(`published-${index.toString().padStart(3, '0')}`);
      entry.description = `Descripción general ${'lectura '.repeat(20)}`;
      return entry;
    });
    books[199].title = 'Misterio en la biblioteca';

    const prompt = buildRecommendationPrompt('Quiero leer un misterio', books);
    const parsedPrompt = JSON.parse(prompt);
    const candidateIds = parsedPrompt.catalog.map((candidate: string[]) => candidate[0]);

    expect(prompt.length).toBeLessThanOrEqual(5000);
    expect(candidateIds).toContain('published-199');
    expect(candidateIds.length).toBeLessThan(books.length);
    expect(candidateIds.length).toBeLessThanOrEqual(50);
  });

  it('only returns up to three unique published books from the provided catalog', () => {
    const publishedBooks = [book('published-1'), book('published-2'), book('published-3'), book('draft', 'draft')];
    const response = JSON.stringify({
      recommendations: [
        { bookId: 'published-1', reason: 'Coincide con tu interés.' },
        { bookId: 'unknown', reason: 'No forma parte del catálogo.' },
        { bookId: 'draft', reason: 'No está publicado.' },
        { bookId: 'published-1', reason: 'Duplicado.' },
        { bookId: 'published-2', reason: 'Comparte el género.' },
        { bookId: 'published-3', reason: 'Puede gustarte.' },
      ],
    });

    expect(parseBookRecommendations(response, publishedBooks)).toEqual([
      { book: publishedBooks[0], reason: 'Coincide con tu interés.' },
      { book: publishedBooks[1], reason: 'Comparte el género.' },
      { book: publishedBooks[2], reason: 'Puede gustarte.' },
    ]);
  });

  it('rejects malformed or incomplete suggestions', () => {
    expect(() => parseBookRecommendations('no es json', [book('published-1')])).toThrow();
    expect(
      parseBookRecommendations(JSON.stringify({ recommendations: 'no es una lista' }), [book('published-1')]),
    ).toEqual([]);
    expect(
      parseBookRecommendations(JSON.stringify({ recommendations: [{ bookId: 'published-1', reason: '  ' }] }), [
        book('published-1'),
      ]),
    ).toEqual([]);
  });
});
