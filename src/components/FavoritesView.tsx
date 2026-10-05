import React from 'react';
import { useApp } from '../context/AppContext';
import { Heart, Trash2, ShoppingBag, BookOpen, Star, BookMarked } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const { 
    favorites, 
    books, 
    toggleFavorite, 
    setSelectedBookForDetail, 
    setSelectedBookForSample, 
    addToCart,
    setActiveView 
  } = useApp();

  const favoriteBooks = books.filter(b => favorites.includes(b.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <Heart className="w-5 h-5 fill-rose-500" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Mi Lista de Favoritos (RF-16)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Libros que has guardado para consultar, comparar o comprar más adelante.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full">
          {favoriteBooks.length} {favoriteBooks.length === 1 ? 'libro guardado' : 'libros guardados'}
        </span>
      </div>

      {favoriteBooks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <Heart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No tienes libros en favoritos</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Explora el catálogo y presiona el ícono de corazón en cualquier libro para agregarlo a esta lista.
          </p>
          <button
            onClick={() => setActiveView('catalog')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoriteBooks.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="relative aspect-3/4 bg-slate-100 cursor-pointer overflow-hidden group">
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  onClick={() => setSelectedBookForDetail(book)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                <button
                  onClick={() => toggleFavorite(book.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-rose-500 rounded-full shadow-md backdrop-blur-xs transition-colors"
                  title="Eliminar de favoritos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div onClick={() => setSelectedBookForDetail(book)} className="cursor-pointer space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {book.genre}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1 hover:text-amber-700 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{book.author}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-base text-slate-900">${book.price.toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(book)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Comprar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
