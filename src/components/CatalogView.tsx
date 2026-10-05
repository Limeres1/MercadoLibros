import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, Filter, SlidersHorizontal, ArrowUpDown, Star, 
  ShoppingBag, BookOpen, Heart, BookMarked, Sparkles, Check, RotateCcw
} from 'lucide-react';
import { Book, BookCondition } from '../types';

export const CatalogView: React.FC = () => {
  const { 
    books, 
    searchQuery, 
    setSearchQuery, 
    setSelectedBookForDetail, 
    setSelectedBookForSample, 
    addToCart, 
    favorites, 
    toggleFavorite 
  } = useApp();

  // Filters state (RF-10)
  const [selectedGenre, setSelectedGenre] = useState<string>('todos');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('todos');
  const [selectedCondition, setSelectedCondition] = useState<string>('todos');
  const [maxPrice, setMaxPrice] = useState<number>(30);
  
  // Sorting state (RF-11)
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'date_new'>('rating');

  // Available unique genres and languages
  const genres = useMemo(() => {
    const list = Array.from(new Set(books.map(b => b.genre))).filter(Boolean);
    return ['todos', ...list];
  }, [books]);

  const languages = useMemo(() => {
    const list = Array.from(new Set(books.map(b => b.language))).filter(Boolean);
    return ['todos', ...list];
  }, [books]);

  // Filtered and sorted books list (RF-7, RF-9, RF-10, RF-11)
  const filteredBooks = useMemo(() => {
    // Only show published books in general public catalog (RF-7)
    let list = books.filter(b => b.status === 'published');

    // RF-9: Search by title or author
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) ||
        b.isbn.replace(/[- ]/g, '').includes(q.replace(/[- ]/g, '')) ||
        b.genre.toLowerCase().includes(q)
      );
    }

    // RF-10: Filter by genre
    if (selectedGenre !== 'todos') {
      list = list.filter(b => b.genre.toLowerCase() === selectedGenre.toLowerCase());
    }

    // RF-10: Filter by language
    if (selectedLanguage !== 'todos') {
      list = list.filter(b => b.language.toLowerCase() === selectedLanguage.toLowerCase());
    }

    // RF-10: Filter by condition
    if (selectedCondition !== 'todos') {
      list = list.filter(b => b.condition === selectedCondition);
    }

    // RF-10: Filter by price
    list = list.filter(b => b.price <= maxPrice);

    // RF-11: Sort books
    list.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'price_asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price_desc') {
        return b.price - a.price;
      }
      if (sortBy === 'date_new') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return list;
  }, [books, searchQuery, selectedGenre, selectedLanguage, selectedCondition, maxPrice, sortBy]);

  const resetFilters = () => {
    setSelectedGenre('todos');
    setSelectedLanguage('todos');
    setSelectedCondition('todos');
    setMaxPrice(30);
    setSearchQuery('');
    setSortBy('rating');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Banner with Literary Elegance */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white p-8 sm:p-12 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_50%)]"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mercado Libros • Catálogo Oficial (RF-7)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Descubre, colecciona y lee grandes obras de la literatura.
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
            Comercio multilateral para adquirir libros nuevos, usados de colección y ediciones digitales con lector integrado y muestras gratuitas.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-amber-200">
            <span>✓ Compraventa segura</span>
            <span>✓ Lector in-app personalizable</span>
            <span>✓ Muestras gratuitas inmediatas</span>
            <span>✓ Búsqueda por ISBN</span>
          </div>
        </div>
      </div>

      {/* Filter and Sorting Controls Bar (RF-9, RF-10, RF-11) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-900 text-sm">Filtros y Búsqueda</span>
            <span className="text-xs text-slate-400">({filteredBooks.length} libros disponibles)</span>
          </div>

          {/* Sort selector (RF-11) */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-semibold text-slate-600">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-slate-800"
            >
              <option value="rating">Mejor Valorados (RF-11)</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="date_new">Más Recientes (Publicación)</option>
            </select>
          </div>
        </div>

        {/* Filter selectors row (RF-10) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Genre Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Género Literario (RF-10)
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-500 text-slate-800 capitalize"
            >
              {genres.map(g => (
                <option key={g} value={g} className="capitalize">
                  {g === 'todos' ? 'Todos los géneros' : g}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Idioma (RF-10)
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-500 text-slate-800"
            >
              {languages.map(l => (
                <option key={l} value={l}>
                  {l === 'todos' ? 'Todos los idiomas' : l}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Formato / Condición
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-500 text-slate-800"
            >
              <option value="todos">Todos los formatos</option>
              <option value="nuevo">Nuevo</option>
              <option value="usado">Usado</option>
              <option value="digital">Digital (eBook)</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Precio máx: ${maxPrice}
              </label>
              {(selectedGenre !== 'todos' || selectedLanguage !== 'todos' || selectedCondition !== 'todos' || maxPrice < 30 || searchQuery) && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] text-amber-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
          </div>

        </div>

      </div>

      {/* Book Cards Grid (RF-7, RF-12) */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-slate-800">No encontramos libros con los filtros seleccionados</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Prueba ajustando el precio máximo, cambiando el género o borrando la búsqueda.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const isFav = favorites.includes(book.id);

            return (
              <div
                key={book.id}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-amber-500/30 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Book Cover Container */}
                <div className="relative aspect-3/4 bg-slate-100 overflow-hidden cursor-pointer">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    onClick={() => setSelectedBookForDetail(book)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Condition Badge */}
                  <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                    book.condition === 'nuevo' ? 'bg-emerald-600 text-white' :
                    book.condition === 'usado' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    {book.condition}
                  </span>

                  {/* Favorite Button (RF-16) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(book.id);
                    }}
                    className={`absolute top-3 right-3 p-2 rounded-full shadow-md backdrop-blur-md transition-all ${
                      isFav 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
                    }`}
                    title="Añadir a favoritos"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
                  </button>

                  {/* Quick Sample Button overlay (RF-14) */}
                  <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookForSample(book);
                      }}
                      className="flex-1 py-2 px-3 bg-white/95 hover:bg-amber-50 text-slate-900 border border-slate-200 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 backdrop-blur-xs transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Muestra</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookForDetail(book);
                      }}
                      className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                    >
                      Ver Ficha
                    </button>
                  </div>
                </div>

                {/* Book Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div 
                    onClick={() => setSelectedBookForDetail(book)}
                    className="cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-amber-700">{book.genre}</span>
                      <span>{book.language}</span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                      {book.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {book.author}
                    </p>

                    {/* Star Rating (RF-13) */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="flex items-center text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{book.rating > 0 ? book.rating : 'Nuevo'}</span>
                      <span className="text-[10px] text-slate-400">({book.reviewCount})</span>
                    </div>
                  </div>

                  {/* Price & Add to Cart Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400">Precio</p>
                      <p className="text-lg font-black text-slate-900">
                        ${book.price.toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => addToCart(book)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                      title="Agregar al carrito de compras"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Comprar</span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
