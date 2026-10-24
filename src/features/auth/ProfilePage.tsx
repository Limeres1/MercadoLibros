import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, User, MapPin, Phone, Plus, Trash2, Award } from 'lucide-react';
import { Book, UserProfile } from '../../types';
import { useBooks } from '../catalog/BooksProvider';
import { useSession } from './SessionProvider';

export const ProfilePage: React.FC = () => {
  const { currentUser } = useSession();
  return currentUser ? <ProfileForm key={currentUser.id} currentUser={currentUser} /> : null;
};

const ProfileForm: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const { updateUserProfile, updateFavoriteBookIds } = useSession();
  const { books } = useBooks();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [isSelectingBook, setIsSelectingBook] = useState(false);

  const selectedFavIds = currentUser.favoriteBookIds || [];
  const selectedFavBooks = selectedFavIds
    .map(id => books.find(b => b.id === id))
    .filter((b): b is Book => Boolean(b));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      displayName,
      photoURL,
      bio,
      location,
      phone
    });
  };

  const handleAddFavoriteBook = (bookId: string) => {
    if (selectedFavIds.length >= 4) return; // Strict max 4
    if (selectedFavIds.includes(bookId)) return;
    const nextList = [...selectedFavIds, bookId];
    updateFavoriteBookIds(nextList);
    setIsSelectingBook(false);
  };

  const handleRemoveFavoriteBook = (bookId: string) => {
    const nextList = selectedFavIds.filter(id => id !== bookId);
    updateFavoriteBookIds(nextList);
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base">Mi Perfil de Usuario</h1>
              <p className="text-xs text-slate-500">Edición de datos y tus 4 libros favoritos</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 sm:p-6 space-y-6">
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-amber-500/20 shadow-md"
              />
              <div className="flex-1 w-full space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    URL de Foto / Avatar
                  </label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Correo Electrónico (Registrado)
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Ubicación / Ciudad
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Buenos Aires, Argentina"
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 11 ..."
                    className="w-full pl-9 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Biografía o Resumen de Lectura
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cuéntale a la comunidad tus géneros predilectos, autores favoritos..."
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Guardar Cambios de Perfil
              </button>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Mis 4 Libros Favoritos en el Perfil</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Destaca en tu perfil tus 4 lecturas de cabecera ({selectedFavIds.length}/4 seleccionados)
                </p>
              </div>

              {selectedFavIds.length < 4 && !isSelectingBook && (
                <button
                  type="button"
                  onClick={() => setIsSelectingBook(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Libro Fav</span>
                </button>
              )}
            </div>

            {isSelectingBook && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Selecciona un libro del catálogo:</span>
                  <button
                    onClick={() => setIsSelectingBook(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {books
                    .filter(b => !selectedFavIds.includes(b.id))
                    .map(book => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => handleAddFavoriteBook(book.id)}
                        className="w-full text-left p-2 bg-white hover:bg-amber-100/70 border border-amber-100 rounded-xl flex items-center gap-3 transition-colors group"
                      >
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-8 h-10 object-cover rounded shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-amber-900 truncate">
                            {book.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{book.author}</p>
                        </div>
                        <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((slotIdx) => {
                const book = selectedFavBooks[slotIdx];

                return (
                  <div
                    key={slotIdx}
                    className={`rounded-2xl border p-3 flex flex-col items-center justify-center text-center relative aspect-3/4 transition-all ${
                      book
                        ? 'bg-slate-50 border-slate-200 shadow-2xs'
                        : 'border-dashed border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                      #{slotIdx + 1}
                    </span>

                    {book ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRemoveFavoriteBook(book.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded bg-white/80 shadow-2xs"
                          title="Quitar de favoritos del perfil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-14 h-20 object-cover rounded-md shadow-xs mb-2 border border-slate-200"
                        />
                        <p className="text-xs font-bold text-slate-900 line-clamp-1 w-full">{book.title}</p>
                        <p className="text-[10px] text-slate-500 truncate w-full">{book.author}</p>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSelectingBook(true)}
                        className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-600 transition-colors p-2"
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-[11px] font-medium">Espacio #{slotIdx + 1}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
