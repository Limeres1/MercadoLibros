import React from 'react';
import { useNavigate } from 'react-router';
import { Library, BookOpen, Bookmark, Star, Calendar } from 'lucide-react';
import { LibraryItem } from '../../types';
import { ROUTES, paths } from '../../constants/routes';
import { useSession } from '../auth/SessionProvider';
import { useBooks } from '../catalog/BooksProvider';
import { useLibrary } from './LibraryProvider';

export const LibraryPage: React.FC = () => {
  const { currentUser } = useSession();
  const { items: userLibraryItems } = useLibrary();
  const { books } = useBooks();
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
        <Library className="w-16 h-16 text-slate-300 mx-auto" />
        <h3 className="text-xl font-bold text-slate-900">Inicia sesión para ver tu biblioteca</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Accede a tus libros adquiridos, continúa tu lectura donde la dejaste y consulta tus marcadores personales.
        </p>
      </div>
    );
  }

  const handleOpenReader = (item: LibraryItem) => navigate(paths.reader(item.bookId));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Library className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Mi Biblioteca Personal
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Libros adquiridos con sincronización de progreso, lector integrado y marcadores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full">
            {userLibraryItems.length} {userLibraryItems.length === 1 ? 'libro en biblioteca' : 'libros en biblioteca'}
          </span>
          <button
            onClick={() => navigate(ROUTES.home)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Explorar más libros
          </button>
        </div>
      </div>

      {userLibraryItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Tu biblioteca está esperando su primera historia</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando adquieras libros físicos o digitales, aparecerán aquí para que disfrutes de la lectura en cualquier momento.
          </p>
          <button
            onClick={() => navigate(ROUTES.home)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Ir al Catálogo de Obras
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userLibraryItems.map((item) => {
            const matchedBook = books.find(b => b.id === item.bookId);
            const total = item.totalPages || 10;
            const current = item.lastReadPage || 1;
            const progress = Math.min(100, Math.round((current / total) * 100));

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="flex gap-4">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-20 h-28 object-cover rounded-xl shadow-xs border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleOpenReader(item)}
                  />

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase">
                      Lectura in-app
                    </span>
                    <h3 
                      onClick={() => handleOpenReader(item)}
                      className="font-bold text-sm text-slate-900 mt-1 line-clamp-1 cursor-pointer hover:text-amber-700 transition-colors"
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{item.author}</p>
                    
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>Comprado el {new Date(item.purchasedAt).toLocaleDateString()}</span>
                    </div>

                    {item.bookmarks.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium mt-1">
                        <Bookmark className="w-3 h-3" />
                        <span>{item.bookmarks.length} {item.bookmarks.length === 1 ? 'marcador guardado' : 'marcadores'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Progreso de lectura</span>
                    <span className="font-bold text-amber-700">{progress}% (Pág. {current} de {total})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenReader(item)}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{current > 1 ? 'Continuar Leyendo' : 'Comenzar Lectura'}</span>
                  </button>

                  {matchedBook && (
                    <button
                      onClick={() => navigate(paths.book(matchedBook.id))}
                      className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium transition-colors"
                      title="Ver ficha y reseñas"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
