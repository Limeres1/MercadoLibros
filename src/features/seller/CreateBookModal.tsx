import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookPlus,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useSellerBooks } from '@/features/seller/useSellerBooks';
import { createId } from '@/lib/ids';
import { ASSET_CONSTRAINTS, uploadBookAsset, validateAssetFile } from '@/services/storage';
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

  // Storage files & URLs
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookFileUrl, setBookFileUrl] = useState<string>('');
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleFileUrl, setSampleFileUrl] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

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
      setCoverPreview(bookToEdit.coverUrl);
      setBookFileUrl(bookToEdit.fileUrl || '');
      setSampleFileUrl(bookToEdit.sampleUrl || '');
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
      setCoverPreview(SAMPLE_COVERS[0]);
      setBookFileUrl('');
      setSampleFileUrl('');
      setPages('250');
      setPublicationYear('2024');
      setStock('10');
      setSampleText('Fragmento del primer capítulo listo para lectura de muestra...');
      setFullContent('Capítulo 1\nEl texto completo de la obra disponible tras la compra.');
    }
  }, [bookToEdit, loadBookContent]);

  // Handle Cover File Selection with CA-1 Validation
  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateAssetFile(file, 'cover');
    if (!validation.valid) {
      showToast(validation.error || ASSET_CONSTRAINTS.cover.formatError, 'error');
      event.target.value = '';
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  // Handle Book File Selection with CA-1 Validation
  const handleBookFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateAssetFile(file, 'bookFile');
    if (!validation.valid) {
      showToast(validation.error || ASSET_CONSTRAINTS.bookFile.formatError, 'error');
      event.target.value = '';
      return;
    }

    setBookFile(file);
  };

  // Handle Sample File Selection with CA-1 Validation
  const handleSampleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateAssetFile(file, 'sampleFile');
    if (!validation.valid) {
      showToast(validation.error || ASSET_CONSTRAINTS.sampleFile.formatError, 'error');
      event.target.value = '';
      return;
    }

    setSampleFile(file);
  };

  const handleSubmit = async (submitForReview: boolean) => {
    if (!title.trim() || !author.trim() || !price) {
      showToast('Por favor completa el título, autor y precio del libro.', 'error');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      showToast('Por favor ingresa un precio válido mayor a 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    const targetBookId = bookToEdit?.id || createId();

    let finalCoverUrl = coverUrl || SAMPLE_COVERS[0];
    let finalBookFileUrl = bookFileUrl;
    let finalSampleFileUrl = sampleFileUrl;

    try {
      // 1. Upload Cover if a new file was chosen
      if (coverFile) {
        setUploadStatus('Subiendo portada a Storage...');
        finalCoverUrl = await uploadBookAsset(targetBookId, coverFile, 'cover');
      }

      // 2. Upload Book File if chosen
      if (bookFile) {
        setUploadStatus('Subiendo archivo del libro a Storage...');
        finalBookFileUrl = await uploadBookAsset(targetBookId, bookFile, 'bookFile');
      }

      // 3. Upload Sample File if chosen
      if (sampleFile) {
        setUploadStatus('Subiendo muestra gratuita a Storage...');
        finalSampleFileUrl = await uploadBookAsset(targetBookId, sampleFile, 'sampleFile');
      }

      setUploadStatus(submitForReview ? 'Enviando a revisión...' : 'Guardando borrador...');

      await saveBook(
        {
          id: targetBookId,
          title: title.trim(),
          author: author.trim(),
          isbn: isbn.trim(),
          description: description.trim(),
          price: numericPrice,
          condition,
          genre,
          language,
          coverUrl: finalCoverUrl,
          fileUrl: finalBookFileUrl || undefined,
          sampleUrl: finalSampleFileUrl || undefined,
          pages: parseInt(pages, 10) || 200,
          publicationYear: parseInt(publicationYear, 10) || new Date().getFullYear(),
          stock: condition === 'digital' ? undefined : parseInt(stock, 10) || 10,
          sampleText: sampleText.trim() || (sampleFile ? `Muestra: ${sampleFile.name}` : 'Fragmento no disponible.'),
        },
        submitForReview,
        fullContent.trim(),
      );

      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el libro.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
      setUploadStatus(null);
    }
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
            <p className="text-xs text-slate-500">Carga de ficha, portada, archivo, muestra y contenido digital</p>
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

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Banner informativo de CA-2: Libro ya publicado vuelve a moderación */}
        {bookToEdit?.status === 'published' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-0.5">
              <p className="font-bold">Aviso de moderación (CA-2)</p>
              <p className="text-amber-800">
                Este libro está publicado actualmente. Al guardar cualquier modificación, pasará automáticamente a
                estado <strong>En Revisión</strong> para que un administrador verifique los cambios antes de volver a la
                tienda.
              </p>
            </div>
          </div>
        )}

        {/* Banner informativo si fue rechazado previamente */}
        {bookToEdit?.status === 'rejected' && bookToEdit.rejectionReason && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-0.5">
              <p className="font-bold">Motivo del rechazo anterior:</p>
              <p className="text-rose-800">{bookToEdit.rejectionReason}</p>
              <p className="text-[11px] text-rose-600 mt-1">
                Corrige las observaciones indicadas antes de volver a enviar a revisión.
              </p>
            </div>
          </div>
        )}

        {/* Ficha técnica principal */}
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
              min="0.10"
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
              <option value="nuevo">Nuevo (Físico)</option>
              <option value="usado">Usado (Físico)</option>
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
              <option value="Tecnología">Tecnología</option>
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
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {condition === 'digital' ? 'Número de Páginas' : 'Cantidad en Stock'}
            </label>
            {condition === 'digital' ? (
              <input
                type="number"
                min="1"
                value={pages}
                onChange={event => setPages(event.target.value)}
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            ) : (
              <input
                type="number"
                min="1"
                value={stock}
                onChange={event => setStock(event.target.value)}
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>

        {/* Sección de Archivos y Subida a Firebase Storage (RF-27, RNF-8, CA-1) */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Archivos y Portada (Firebase Storage)</span>
          </h4>

          {/* 1. Subir Portada */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Portada del Libro *</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Formatos: JPG, PNG, WebP (máx. {ASSET_CONSTRAINTS.cover.maxSizeLabel})
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-4 items-start">
              {coverPreview && (
                <div className="w-20 h-28 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-2xs bg-white">
                  <img src={coverPreview} alt="Vista previa de portada" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                {coverFile ? (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Seleccionado: {coverFile.name} ({(coverFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">O elegir muestra:</span>
                    {SAMPLE_COVERS.slice(0, 4).map((cover, index) => (
                      <button
                        type="button"
                        key={index}
                        onClick={() => {
                          setCoverUrl(cover);
                          setCoverPreview(cover);
                          setCoverFile(null);
                        }}
                        className="w-5 h-7 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-emerald-500"
                      >
                        <img src={cover} alt="cover option" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Subir Archivo del Libro */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Archivo Completo del Libro</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Formatos: PDF, EPUB, TXT (máx. {ASSET_CONSTRAINTS.bookFile.maxSizeLabel})
              </span>
            </div>

            <input
              type="file"
              accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain"
              onChange={handleBookFileChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />

            {bookFile ? (
              <p className="text-[11px] text-indigo-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Listo para subir: {bookFile.name} ({(bookFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </p>
            ) : bookFileUrl ? (
              <p className="text-[11px] text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Archivo cargado previamente en Storage.</span>
              </p>
            ) : null}
          </div>

          {/* 3. Subir Muestra Gratuita */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Archivo de Muestra Gratuita</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Formatos: PDF, EPUB, TXT (máx. {ASSET_CONSTRAINTS.sampleFile.maxSizeLabel})
              </span>
            </div>

            <input
              type="file"
              accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain"
              onChange={handleSampleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
            />

            {sampleFile ? (
              <p className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Listo para subir: {sampleFile.name} ({(sampleFile.size / 1024).toFixed(1)} KB)
                </span>
              </p>
            ) : sampleFileUrl ? (
              <p className="text-[11px] text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Muestra cargada previamente en Storage.</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Sinopsis / Descripción */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Sinopsis / Descripción</label>
          <textarea
            rows={3}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Escribe la reseña descriptiva de la obra..."
            className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Fragmento de muestra en texto */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
            <span>Fragmento de Muestra (Texto)</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-normal">
              Lectura previa para compradores
            </span>
          </label>
          <textarea
            rows={3}
            value={sampleText}
            onChange={event => setSampleText(event.target.value)}
            placeholder="Fragmento inicial que los usuarios pueden leer directamente en la web..."
            className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-serif"
          />
        </div>

        {/* Contenido completo digital (opcional / fallback para lector in-app) */}
        {condition === 'digital' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
              <span>Texto Completo del Libro (Lector Web)</span>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-normal">
                Para el lector digital integrado tras la compra
              </span>
            </label>
            <textarea
              rows={3}
              value={fullContent}
              onChange={event => setFullContent(event.target.value)}
              placeholder="Capítulo 1...\nTexto de la obra disponible en el lector web..."
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-serif"
            />
          </div>
        )}
      </div>

      {/* Acciones del Modal: Guardar Borrador y Enviar a Revisión */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onClose}
          className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-medium transition-colors"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-2">
          {uploadStatus && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Guardar Borrador</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Enviar a Revisión</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
