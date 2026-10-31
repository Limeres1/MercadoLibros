import { MemoryRouter, Route, Routes } from 'react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_BOOKS, INITIAL_LIBRARY } from '@/data/initialData';
import { ReaderPage } from '@/features/reader/ReaderPage';
import { Book, LibraryItem } from '@/types';

const state = vi.hoisted(() => ({
  book: undefined as Book | undefined,
  item: undefined as LibraryItem | undefined,
  bookLoading: false,
  libraryLoading: false,
  contentLoading: false,
  text: 'Texto completo comprado.' as string | null,
  updateProgress: vi.fn(),
  loadContent: vi.fn(),
}));

vi.mock('@/features/catalog/BooksProvider', () => ({
  useBook: () => ({ book: state.book, isLoading: state.bookLoading }),
  useBookContent: () => {
    state.loadContent();
    return { text: state.text, isLoading: state.contentLoading };
  },
}));

vi.mock('@/features/reader/LibraryProvider', () => ({
  useLibrary: () => ({
    getItem: (bookId: string) => (state.item?.bookId === bookId ? state.item : undefined),
    isLoading: state.libraryLoading,
    updateReadingProgress: state.updateProgress,
    addBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
  }),
}));

const renderReader = () =>
  render(
    <MemoryRouter initialEntries={['/leer/purchased-book']}>
      <Routes>
        <Route path="/leer/:bookId" element={<ReaderPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  state.book = { ...INITIAL_BOOKS[0], id: 'purchased-book' };
  state.item = { ...INITIAL_LIBRARY[0], bookId: 'purchased-book', bookmarks: [] };
  state.bookLoading = false;
  state.libraryLoading = false;
  state.contentLoading = false;
  state.text = 'Texto completo comprado.';
  state.updateProgress.mockClear();
  state.loadContent.mockClear();
});

describe('full text and page navigation', () => {
  it.each(['Claro', 'Sepia', 'Noche'])(
    'selects and restores the %s theme without changing the reading position',
    name => {
      const view = renderReader();
      fireEvent.click(screen.getByTitle('Personalizar Lector: Temas y Tamaño de Letra'));
      fireEvent.click(screen.getByRole('button', { name }));
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
      expect(state.updateProgress).not.toHaveBeenCalled();
      view.unmount();
      renderReader();
      fireEvent.click(screen.getByTitle('Personalizar Lector: Temas y Tamaño de Letra'));
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    },
  );

  it('changes the rendered font size with buttons and slider, and restores it after reopening', () => {
    const view = renderReader();
    fireEvent.click(screen.getByTitle('Personalizar Lector: Temas y Tamaño de Letra'));
    const smaller = screen.getByRole('button', { name: 'Reducir tamaño de letra' });
    const larger = screen.getByRole('button', { name: 'Aumentar tamaño de letra' });
    const slider = screen.getByRole('slider', { name: 'Tamaño de letra' });
    const textContainer = screen.getByText('Texto completo comprado.').parentElement;
    expect(textContainer).toHaveStyle({ fontSize: '18px' });
    fireEvent.click(larger);
    expect(textContainer).toHaveStyle({ fontSize: '20px' });
    fireEvent.click(smaller);
    expect(textContainer).toHaveStyle({ fontSize: '18px' });
    fireEvent.change(slider, { target: { value: '14' } });
    expect(smaller).toBeDisabled();
    expect(textContainer).toHaveStyle({ fontSize: '14px' });
    fireEvent.change(slider, { target: { value: '26' } });
    expect(larger).toBeDisabled();
    expect(textContainer).toHaveStyle({ fontSize: '26px' });
    expect(screen.getByRole('slider', { name: 'Página de lectura' })).toHaveValue('1');
    expect(state.updateProgress).not.toHaveBeenCalled();
    view.unmount();
    renderReader();
    expect(screen.getByText('Texto completo comprado.').parentElement).toHaveStyle({ fontSize: '26px' });
    fireEvent.click(screen.getByTitle('Personalizar Lector: Temas y Tamaño de Letra'));
    expect(screen.getByRole('slider', { name: 'Tamaño de letra' })).toHaveValue('26');
  });

  it('waits for full text without showing the free sample or saving a page', () => {
    state.contentLoading = true;
    state.text = null;
    renderReader();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Página siguiente' })).not.toBeInTheDocument();
    expect(screen.queryByText(state.book!.sampleText)).not.toBeInTheDocument();
    expect(state.updateProgress).not.toHaveBeenCalled();
  });

  it.each([null, '', ' \n '])('shows an unavailable state for missing or empty full text (%s)', text => {
    state.text = text;
    renderReader();
    expect(screen.getByText('No pudimos cargar el texto completo')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByText(state.book!.sampleText)).not.toBeInTheDocument();
    expect(state.updateProgress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la biblioteca' }));
    expect(screen.queryByText('No pudimos cargar el texto completo')).not.toBeInTheDocument();
  });

  it('navigates all paragraphs with buttons and slider, respecting the first and last page', () => {
    state.text = 'Párrafo uno.\n\nPárrafo dos.\n\nPárrafo tres.\n\nPárrafo cuatro.\n\nÚltimo párrafo.';
    renderReader();
    const previous = screen.getByRole('button', { name: 'Página anterior' });
    const next = screen.getByRole('button', { name: 'Página siguiente' });
    const slider = screen.getByRole('slider', { name: 'Página de lectura' });
    expect(previous).toBeDisabled();
    expect(slider).toHaveValue('1');
    expect(screen.getByText(/Párrafo uno/)).toHaveTextContent('Párrafo dos.');
    const main = screen.getByRole('main');
    main.scrollTop = 200;
    fireEvent.click(next);
    expect(main.scrollTop).toBe(0);
    expect(screen.getByText(/Párrafo tres/)).toHaveTextContent('Párrafo cuatro.');
    expect(state.updateProgress).toHaveBeenLastCalledWith('purchased-book', 2);
    fireEvent.change(slider, { target: { value: '3' } });
    expect(screen.getByText('Último párrafo.')).toBeInTheDocument();
    expect(next).toBeDisabled();
    fireEvent.click(previous);
    expect(slider).toHaveValue('2');
  });

  it('supports keyboard navigation without turning pages while editing a bookmark', () => {
    state.text = 'Primero.\n\nSegundo.\n\nTercero.';
    renderReader();
    const slider = screen.getByRole('slider', { name: 'Página de lectura' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(slider).toHaveValue('2');
    fireEvent.keyDown(window, { key: 'PageUp' });
    expect(slider).toHaveValue('1');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(slider).toHaveValue('1');
    state.updateProgress.mockClear();
    fireEvent.click(screen.getByTitle('Marcadores y notas'));
    fireEvent.keyDown(screen.getByPlaceholderText('Título del marcador (opcional)'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByPlaceholderText('Nota personal de lectura...'), { key: 'PageDown' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    expect(slider).toHaveValue('1');
    expect(state.updateProgress).not.toHaveBeenCalled();
  });

  it('clamps a saved position to the available full text without writing it back', () => {
    state.item = { ...state.item!, lastReadPage: 100 };
    state.text = 'Una sola página.';
    renderReader();
    expect(screen.getByRole('slider')).toHaveValue('1');
    expect(state.updateProgress).not.toHaveBeenCalled();
  });
});

describe('reader purchase access', () => {
  it('waits for the library instead of denying access before the purchase arrives', () => {
    state.item = undefined;
    state.libraryLoading = true;
    const view = renderReader();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Este libro no está en tu biblioteca')).not.toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();

    state.libraryLoading = false;
    state.item = { ...INITIAL_LIBRARY[0], bookId: 'purchased-book', bookmarks: [] };
    view.rerender(
      <MemoryRouter initialEntries={['/leer/purchased-book']}>
        <Routes>
          <Route path="/leer/:bookId" element={<ReaderPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Texto completo comprado.')).toBeInTheDocument();
  });

  it('waits for book metadata before opening the reader', () => {
    state.book = undefined;
    state.bookLoading = true;
    renderReader();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();
  });

  it('does not request full text for an unpurchased book opened by URL', () => {
    state.item = undefined;
    renderReader();
    expect(screen.getByText('Este libro no está en tu biblioteca')).toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();
  });

  it('does not grant access using a different purchased book', () => {
    state.item = { ...INITIAL_LIBRARY[0], bookId: 'another-book' };
    renderReader();
    expect(screen.getByText('Este libro no está en tu biblioteca')).toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();
  });

  it.each(['published', 'withdrawn'] as const)('opens a purchased %s book', status => {
    state.book = { ...state.book!, status };
    renderReader();
    expect(screen.getByText('Texto completo comprado.')).toBeInTheDocument();
  });
});
