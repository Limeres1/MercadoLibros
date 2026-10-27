import React, { useEffect, useState } from 'react';
import { BookPlus, Save, Send, X } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useSellerBooks } from '@/features/seller/useSellerBooks';
import { Book, BookCondition } from '@/types';

interface CreateBookModalProps {
  bookToEdit: Book | null;
  onClose: () => void;
}

const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
];

export const CreateBookModal: React.FC<CreateBookModalProps> = ({ bookToEdit, onClose }) => {
  const { saveBook } = useSellerBooks();
  const { loadBookContent } = useBooks();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('15.00');
  const [condition, setCondition] = useState<BookCondition>('nuevo');
  const [genre, setGenre] = useState('Ficción');
  const [language, setLanguage] = useState('Español');
  const [coverUrl, setCoverUrl] = useState('');
  const [pages, setPages] = useState('250');
  const [publicationYear, setPublicationYear] = useState('2024');
  const [stock, setStock] = useState('10');
  const [sampleText, setSampleText] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bookToEdit) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setIsbn(bookToEdit.isbn);
      setDescription(bookToEdit.description);
      setPrice(String(bookToEdit.price));
      setCondition(bookToEdit.condition);
      setGenre(bookToEdit.genre);
      setLanguage(bookToEdit.language);
      setCoverUrl(bookToEdit.coverUrl);
      setPages(String(bookToEdit.pages));
      setPublicationYear(String(bookToEdit.publicationYear));
      setStock(String(bookToEdit.stock || 10));
      setSampleText(bookToEdit.sampleText || '');
      setFullContent('');
      loadBookContent(bookToEdit.id).then(text => setFullContent(text ?? ''));
    } else {
      setTitle('');
      setAuthor('');
      setIsbn('');
      setDescription('');
      setPrice('15.00');
      setCondition('nuevo');
      setGenre('Ficción');
      setLanguage('Español');
      setCoverUrl(SAMPLE_COVERS[0]);
      setPages('250');
      setPublicationYear('2024');
      setStock('10');
      setSampleText('Fragmento del primer capítulo listo para lectura de muestra...');
      setFullContent('Capítulo 1\nEl texto completo de la obra disponible tras la compra.');
    }
  }, [bookToEdit, loadBookContent]);

  const handleSubmit = async (submitForReview: boolean) => {
    if (!title.trim() || !author.trim() || !price) {
      showToast('Por favor completa el título, autor y precio del libro.', 'error');
      return;
    }

    setIsSubmitting(true);
    await saveBook(
      {
        id: bookToEdit?.id,
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        description: description.trim(),
        price: parseFloat(price) || 10,
        condition,
        genre,
        language,
        coverUrl: coverUrl || SAMPLE_COVERS[0],
        pages: parseInt(pages) || 200,
        publicationYear: parseInt(publicationYear) || 2024,
        stock: parseInt(stock) || 10,
        sampleText: sampleText.trim(),
      },
      submitForReview,
      fullContent.trim(),
    );
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal onClose={onClose} labelledBy="book-form-title" className="max-w-3xl bg-white rounded-3xl border-slate-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <BookPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 id="book-form-title" className="font-bold text-slate-900 text-base">
              {bookToEdit ? 'Editar Libro' : 'Publicar Nuevo Libro'}
            </h3>
            <p className="text-xs text-slate-500">Carga de ficha, portada, muestra y contenido digital</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Título de la Obra *</label>
            <input
              type="text"
              required
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Ej: Rayuela"
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Autor / Escritor *</label>
            <input
              type="text"
              required
              value={author}
              onChange={event => setAuthor(event.target.value)}
              placeholder="Ej: Julio Cortázar"
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Código ISBN</label>
            <input
              type="text"
              value={isbn}
              onChange={event => setIsbn(event.target.value)}
              placeholder="978-..."
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Precio de Venta (USD) *</label>
            <input
              type="number"
              step="0.10"
              min="1"
              required
              value={price}
              onChange={event => setPrice(event.target.value)}
              placeholder="15.00"
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Formato / Condición</label>
            <select
              value={condition}
              onChange={event => setCondition(event.target.value as BookCondition)}
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
            >
              <option value="nuevo">Nuevo</option>
              <option value="usado">Usado</option>
              <option value="digital">Digital (eBook)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Género</label>
            <select
              value={genre}
              onChange={event => setGenre(event.target.value)}
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
            >
              <option value="Ficción">Ficción</option>
              <option value="Novela">Novela</option>
              <option value="Realismo Mágico">Realismo Mágico</option>
              <option value="Distopía">Distopía</option>
              <option value="Clásico">Clásico</option>
              <option value="Romance">Romance</option>
              <option value="Poesía">Poesía</option>
              <option value="Ensayo">Ensayo</option>
              <option value="Historia">Historia</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Idioma</label>
            <select
              value={language}
              onChange={event => setLanguage(event.target.value)}
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
            >
              <option value="Español">Español</option>
              <option value="Inglés">Inglés</option>
              <option value="Portugués">Portugués</option>
              <option value="Francés">Francés</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Cantidad en Stock / Ejemplares</label>
            <input
              type="number"
              min="1"
              value={stock}
              onChange={event => setStock(event.target.value)}
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Portada del Libro (URL de Imagen)</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={coverUrl}
              onChange={event => setCoverUrl(event.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="flex-1 p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-400">Portadas de muestra:</span>
            {SAMPLE_COVERS.map((cover, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setCoverUrl(cover)}
                className="w-6 h-8 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-emerald-500"
              >
                <img src={cover} alt="cover preview" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Sinopsis / Descripción</label>
          <textarea
            rows={3}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Escribe la reseña descriptiva del libro..."
            className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
            <span>Fragmento de Muestra Gratuita</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-normal">
              Disponible para visitantes antes de comprar
            </span>
          </label>
          <textarea
            rows={3}
            value={sampleText}
            onChange={event => setSampleText(event.target.value)}
            placeholder="Fragmento inicial que los usuarios pueden leer gratuitamente..."
            className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-serif"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
            <span>Contenido Completo del Libro</span>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-normal">
              Para el lector digital in-app tras la compra
            </span>
          </label>
          <textarea
            rows={4}
            value={fullContent}
            onChange={event => setFullContent(event.target.value)}
            placeholder="Capítulo 1...\nTexto completo o capítulos de la obra..."
            className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-serif"
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-medium transition-colors"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Guardar Borrador</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Enviar a Revisión</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
