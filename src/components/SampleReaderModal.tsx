import React from 'react';
import { useApp } from '../context/AppContext';
import { X, BookOpen, ShoppingBag, Heart, Share2, Sparkles } from 'lucide-react';

export const SampleReaderModal: React.FC = () => {
  const { 
    selectedBookForSample, 
    setSelectedBookForSample, 
    addToCart, 
    toggleFavorite, 
    favorites,
    showToast
  } = useApp();

  if (!selectedBookForSample) return null;

  const isFav = favorites.includes(selectedBookForSample.id);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Enlace de la muestra copiado al portapapeles.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] text-[#2C2416] rounded-2xl shadow-2xl border border-amber-900/10 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/10 bg-[#FAF6EE]">
          <div className="flex items-center gap-3">
            <img
              src={selectedBookForSample.coverUrl}
              alt={selectedBookForSample.title}
              className="w-10 h-14 object-cover rounded shadow-xs border border-amber-900/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/60 text-amber-900 uppercase tracking-wider">
                  Muestra Gratuita (RF-14)
                </span>
                <span className="text-xs text-slate-500 font-mono">ISBN: {selectedBookForSample.isbn}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-base leading-tight font-serif">
                {selectedBookForSample.title}
              </h3>
              <p className="text-xs text-slate-600">Por {selectedBookForSample.author}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleFavorite(selectedBookForSample.id)}
              className={`p-2 rounded-lg transition-colors ${
                isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
              }`}
              title="Guardar en favoritos"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Compartir"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedBookForSample(null)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Body with Typography and Scrollable excerpt */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif leading-relaxed text-base sm:text-lg text-slate-800 space-y-5 selection:bg-amber-200">
          <div className="text-center pb-4 border-b border-amber-900/10">
            <span className="text-xs font-sans uppercase tracking-widest text-amber-800 font-bold block mb-1">
              Fragmento de Cortesía
            </span>
            <h2 className="text-2xl font-bold text-slate-900">{selectedBookForSample.title}</h2>
            <p className="text-sm text-slate-600 font-sans mt-0.5">{selectedBookForSample.author}</p>
          </div>

          <div className="prose max-w-none text-slate-800 whitespace-pre-line leading-loose text-justify">
            {selectedBookForSample.sampleText || 'Fragmento no disponible en este momento.'}
          </div>

          <div className="my-8 p-6 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center font-sans">
            <Sparkles className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <h4 className="font-bold text-slate-900 text-sm mb-1">Fin del fragmento de muestra</h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
              ¿Deseas continuar leyendo la obra completa? Adquiere tu ejemplar digital o físico de inmediato.
            </p>
            <button
              onClick={() => {
                addToCart(selectedBookForSample);
                setSelectedBookForSample(null);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/20 transition-all hover:scale-102"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Comprar por ${selectedBookForSample.price.toFixed(2)}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-amber-900/10 bg-[#FAF6EE] flex items-center justify-between text-xs text-slate-500 font-sans">
          <span>Género: {selectedBookForSample.genre} • {selectedBookForSample.language}</span>
          <button
            onClick={() => setSelectedBookForSample(null)}
            className="hover:underline font-medium text-slate-700"
          >
            Cerrar muestra
          </button>
        </div>

      </div>
    </div>
  );
};
