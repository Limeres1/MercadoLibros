import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Bookmark as BookmarkIcon,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Moon,
  Plus,
  Settings2,
  Sun,
  Trash2,
  Type,
  X,
} from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { ROUTES } from '@/constants/routes';
import { useBook, useBookContent } from '@/features/catalog/BooksProvider';
import { useLibrary } from '@/features/reader/LibraryProvider';
import { useReaderSettings } from '@/features/reader/useReaderSettings';
import { Book, Bookmark, LibraryItem } from '@/types';

export const ReaderPage: React.FC = () => {
  const { bookId } = useParams();
  const { book, isLoading } = useBook(bookId);
  const { getItem, isLoading: isLibraryLoading } = useLibrary();
  const libraryItem = bookId ? getItem(bookId) : undefined;

  if (isLibraryLoading || (isLoading && !book)) return <PageLoader />;

  if (!book || !libraryItem) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Este libro no está en tu biblioteca"
        description="Sólo podés leer completos los libros que compraste."
      />
    );
  }

  return <PurchasedReader key={book.id} book={book} libraryItem={libraryItem} />;
};

const PurchasedReader: React.FC<{ book: Book; libraryItem: LibraryItem }> = ({ book, libraryItem }) => {
  const { text, isLoading } = useBookContent(book.id);
  const navigate = useNavigate();

  if (isLoading) return <PageLoader />;

  if (!text?.trim()) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No pudimos cargar el texto completo"
        description="Volvé a intentarlo desde tu biblioteca. Si el problema continúa, contactá al vendedor."
        action={
          <button onClick={() => navigate(ROUTES.library)} className="text-amber-700 font-semibold">
            Volver a la biblioteca
          </button>
        }
      />
    );
  }

  return <Reader book={book} libraryItem={libraryItem} contentText={text} />;
};

const Reader: React.FC<{ book: Book; libraryItem: LibraryItem; contentText: string }> = ({
  book,
  libraryItem,
  contentText,
}) => {
  const navigate = useNavigate();
  const { readerSettings, updateReaderSettings } = useReaderSettings();
  const { updateReadingProgress, addBookmark, deleteBookmark } = useLibrary();
  const closeReader = useCallback(() => navigate(ROUTES.library), [navigate]);

  const [currentPage, setCurrentPage] = useState(1);
  const contentRef = useRef<HTMLElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarksList, setShowBookmarksList] = useState(false);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkNote, setNewBookmarkNote] = useState('');

  const pagesText = useMemo(() => {
    const raw = contentText;
    const paragraphs = raw.split(/\n\s*\n/).filter(paragraph => paragraph.trim().length > 0);

    const pages: string[] = [];
    let currentBatch: string[] = [];

    paragraphs.forEach((paragraph, idx) => {
      currentBatch.push(paragraph);
      if (currentBatch.length >= 2 || idx === paragraphs.length - 1) {
        pages.push(currentBatch.join('\n\n'));
        currentBatch = [];
      }
    });

    if (pages.length === 0) pages.push(raw);
    return pages;
  }, [contentText]);

  const totalPages = pagesText.length;

  useEffect(() => {
    setCurrentPage(Math.max(1, Math.min(libraryItem.lastReadPage || 1, totalPages)));
  }, [libraryItem.lastReadPage, totalPages]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [currentPage]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
      updateReadingProgress(book.id, newPage);
    },
    [book.id, totalPages, updateReadingProgress],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (event.key === 'Escape') {
        closeReader();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeReader, currentPage, handlePageChange]);

  const currentBookmarks: Bookmark[] = libraryItem.bookmarks;

  const handleCreateBookmark = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newBookmarkTitle.trim() || `Página ${currentPage} - ${pagesText[currentPage - 1]?.slice(0, 30)}...`;
    addBookmark(book.id, currentPage, title, newBookmarkNote.trim());
    setNewBookmarkTitle('');
    setNewBookmarkNote('');
    setShowBookmarksList(false);
  };

  const themeClasses = {
    light: 'bg-white text-slate-800 border-slate-200',
    sepia: 'bg-[#FBF0D9] text-[#4A3B2C] border-[#E8D9BE]',
    dark: 'bg-[#18181B] text-[#E4E4E7] border-[#27272A]',
  }[readerSettings.theme];

  const headerThemeClasses = {
    light: 'bg-slate-50/95 border-b border-slate-200 text-slate-800',
    sepia: 'bg-[#F4E8D0]/95 border-b border-[#E0D2B7] text-[#4A3B2C]',
    dark: 'bg-[#121214]/95 border-b border-[#27272A] text-slate-200',
  }[readerSettings.theme];

  const fontClasses = readerSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  const lineHeightClasses = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  }[readerSettings.lineHeight];

  const progressPercentage = Math.round((currentPage / totalPages) * 100);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${themeClasses} transition-colors duration-200`}>
      <header
        className={`px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs backdrop-blur-md ${headerThemeClasses} select-none`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={closeReader}
            className="p-1.5 rounded-lg hover:opacity-75 transition-opacity"
            title="Volver a la Biblioteca"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-sm sm:text-base leading-tight max-w-[200px] sm:max-w-md truncate">
              {book.title}
            </h2>
            <p className="text-xs opacity-75">{book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-2 mr-3 px-3 py-1 rounded-full text-xs font-medium border border-current opacity-80">
            <span>
              Pág {currentPage} de {totalPages}
            </span>
            <span>•</span>
            <span>{progressPercentage}%</span>
          </div>

          <button
            onClick={() => {
              setShowBookmarksList(!showBookmarksList);
              setShowSettings(false);
            }}
            className={`p-2 rounded-lg transition-colors relative ${
              showBookmarksList ? 'bg-amber-500/20 text-amber-600' : 'hover:opacity-80'
            }`}
            title="Marcadores y notas"
          >
            <BookmarkIcon className="w-5 h-5" />
            {currentBookmarks.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>

          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowBookmarksList(false);
            }}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-amber-500/20 text-amber-600' : 'hover:opacity-80'
            }`}
            title="Personalizar Lector: Temas y Tamaño de Letra"
          >
            <Settings2 className="w-5 h-5" />
          </button>

          <button
            onClick={closeReader}
            className="p-2 rounded-lg hover:opacity-80 transition-colors ml-1"
            title="Cerrar Lector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="absolute top-16 right-4 sm:right-6 w-80 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-600" />
              <span>Personalización de Lectura</span>
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Tema visual
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => updateReaderSettings({ theme: 'light' })}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  readerSettings.theme === 'light'
                    ? 'border-amber-500 bg-amber-50/50 text-slate-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-600" />
                <span>Claro</span>
              </button>

              <button
                onClick={() => updateReaderSettings({ theme: 'sepia' })}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  readerSettings.theme === 'sepia'
                    ? 'border-amber-600 bg-[#F4E8D0] text-[#4A3B2C] ring-2 ring-amber-600/20'
                    : 'border-[#E0D2B7] bg-[#FBF0D9] text-[#4A3B2C] hover:opacity-90'
                }`}
              >
                <Coffee className="w-4 h-4 text-[#8C6D4A]" />
                <span>Sepia</span>
              </button>

              <button
                onClick={() => updateReaderSettings({ theme: 'dark' })}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  readerSettings.theme === 'dark'
                    ? 'border-amber-500 bg-slate-800 text-white ring-2 ring-amber-500/20'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-amber-400" />
                <span>Noche</span>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tamaño de letra</label>
              <span className="text-xs font-bold text-amber-600">{readerSettings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateReaderSettings({ fontSize: Math.max(14, readerSettings.fontSize - 2) })}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                A-
              </button>
              <input
                type="range"
                min="14"
                max="26"
                step="2"
                value={readerSettings.fontSize}
                onChange={event => updateReaderSettings({ fontSize: Number(event.target.value) })}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                onClick={() => updateReaderSettings({ fontSize: Math.min(26, readerSettings.fontSize + 2) })}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                A+
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Tipografía
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateReaderSettings({ fontFamily: 'serif' })}
                className={`p-2 rounded-xl border text-xs font-serif transition-all ${
                  readerSettings.fontFamily === 'serif'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Serif (Editorial)
              </button>
              <button
                onClick={() => updateReaderSettings({ fontFamily: 'sans' })}
                className={`p-2 rounded-xl border text-xs font-sans transition-all ${
                  readerSettings.fontFamily === 'sans'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Sans (Moderna)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Interlineado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'relaxed', 'loose'] as const).map(lh => (
                <button
                  key={lh}
                  onClick={() => updateReaderSettings({ lineHeight: lh })}
                  className={`p-1.5 rounded-lg border text-xs capitalize transition-all ${
                    readerSettings.lineHeight === lh
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 font-bold'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {lh === 'normal' ? 'Normal' : lh === 'relaxed' ? 'Cómodo' : 'Amplio'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBookmarksList && (
        <div className="absolute top-16 right-4 sm:right-6 w-88 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <BookmarkIcon className="w-4 h-4 text-amber-600" />
              <span>Marcadores y Notas</span>
            </h4>
            <button onClick={() => setShowBookmarksList(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleCreateBookmark}
            className="mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-600">Marcador en Página {currentPage}</span>
            </div>
            <input
              type="text"
              placeholder="Título del marcador (opcional)"
              value={newBookmarkTitle}
              onChange={event => setNewBookmarkTitle(event.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-2 outline-none focus:border-amber-500"
            />
            <textarea
              placeholder="Nota personal de lectura..."
              rows={2}
              value={newBookmarkNote}
              onChange={event => setNewBookmarkNote(event.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-2 outline-none focus:border-amber-500 resize-none"
            />
            <button
              type="submit"
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar Marcador</span>
            </button>
          </form>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {currentBookmarks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No tienes marcadores guardados aún en este libro.
              </p>
            ) : (
              currentBookmarks.map(bm => (
                <div
                  key={bm.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start justify-between gap-2"
                >
                  <div
                    onClick={() => {
                      handlePageChange(bm.page);
                      setShowBookmarksList(false);
                    }}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[10px]">
                        Pág {bm.page}
                      </span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{bm.title}</p>
                    </div>
                    {bm.note && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{bm.note}"</p>}
                  </div>
                  <button
                    onClick={() => deleteBookmark(book.id, bm.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded"
                    title="Eliminar marcador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <main ref={contentRef} className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-between min-h-[60vh]">
          <div
            style={{ fontSize: `${readerSettings.fontSize}px` }}
            className={`${fontClasses} ${lineHeightClasses} space-y-6 text-justify`}
          >
            <div className="text-center opacity-60 text-xs uppercase tracking-widest font-sans pb-4 border-b border-current">
              {book.title} — Página {currentPage} de {totalPages}
            </div>

            <div className="whitespace-pre-line leading-relaxed selection:bg-amber-300 selection:text-slate-950">
              {pagesText[currentPage - 1] || 'Fin del contenido disponible.'}
            </div>
          </div>
        </div>
      </main>

      <footer
        className={`px-4 sm:px-8 py-3 flex items-center justify-between border-t shadow-xs select-none ${headerThemeClasses}`}
      >
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          aria-label="Página anterior"
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-current disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 text-xs font-medium transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Página anterior</span>
        </button>

        <div className="flex-1 max-w-md mx-4 flex items-center gap-3">
          <span className="text-xs opacity-75 font-mono">1</span>
          <input
            type="range"
            aria-label="Página de lectura"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={event => handlePageChange(Number(event.target.value))}
            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg"
          />
          <span className="text-xs opacity-75 font-mono">{totalPages}</span>
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          aria-label="Página siguiente"
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-current disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 text-xs font-medium transition-all"
        >
          <span className="hidden sm:inline">Página siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};
