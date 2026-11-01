import React, { useEffect, useId, useRef, useState } from 'react';
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
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { BOOK_GENRES, BOOK_LANGUAGES } from '@/constants/catalog';
import { useBooks } from '@/features/catalog/BooksProvider';
import { AIBookProposal, generateBookProposal, mergeKeywords } from '@/features/seller/aiBookProposal';
import { AIProposalPanel } from '@/features/seller/AIProposalPanel';
import {
  BOOK_FILE_LIMITS,
  BookFileKind,
  checkContentSize,
  describeText,
  MAX_SAMPLE_LENGTH,
  prepareCover,
  readBookText,
  takeSample,
  validateBookFile,
} from '@/features/seller/bookFiles';
import { KeywordsField } from '@/features/seller/KeywordsField';
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
];

const INPUT_CLASS =
  'w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500';
const FILE_INPUT_CLASS =
  'block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer';
const LABEL_CLASS = 'text-xs font-semibold text-slate-700 block mb-1';

const acceptFor = (kind: BookFileKind) => BOOK_FILE_LIMITS[kind].extensions.map(extension => `.${extension}`).join(',');

interface FileStatus {
  busy: boolean;
  error: string | null;
  info: string | null;
}

const IDLE: FileStatus = { busy: false, error: null, info: null };

const FileFeedback: React.FC<{ status: FileStatus; id: string }> = ({ status, id }) => (
  <div id={id} aria-live="polite" className="text-[11px]">
    {status.busy && (
      <p className="flex items-center gap-1 text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Leyendo el archivo…
      </p>
    )}
    {status.error && (
      <p role="alert" className="flex items-start gap-1 font-medium text-rose-700">
        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {status.error}
      </p>
    )}
    {status.info && !status.error && !status.busy && (
      <p className="flex items-center gap-1 font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {status.info}
      </p>
    )}
  </div>
);

const summarize = (text: string) => {
  const { words, readerPages } = describeText(text);
  return `${words.toLocaleString('es-AR')} palabras · ${readerPages} páginas en el lector`;
};

export const CreateBookModal: React.FC<CreateBookModalProps> = ({ bookToEdit, onClose }) => {
  const { saveBook } = useSellerBooks();
  const { loadBookContent } = useBooks();
  const { showToast } = useToast();
  const fieldId = useId();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('15.00');
  const [condition, setCondition] = useState<BookCondition>('nuevo');
  const [genre, setGenre] = useState<string>('Ficción');
  const [language, setLanguage] = useState<string>('Español');
  const [coverUrl, setCoverUrl] = useState(SAMPLE_COVERS[0]);
  const [pages, setPages] = useState('250');
  const [publicationYear, setPublicationYear] = useState(String(new Date().getFullYear()));
  const [stock, setStock] = useState('10');
  const [sampleText, setSampleText] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [aiProposal, setAiProposal] = useState<AIBookProposal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRequestRef = useRef(0);

  const [coverStatus, setCoverStatus] = useState<FileStatus>(IDLE);
  const [bookFileStatus, setBookFileStatus] = useState<FileStatus>(IDLE);
  const [sampleFileStatus, setSampleFileStatus] = useState<FileStatus>(IDLE);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!bookToEdit) return;
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
    setStock(String(bookToEdit.stock ?? 0));
    setSampleText(bookToEdit.sampleText || '');
    setKeywords(bookToEdit.keywords ?? []);
    if (bookToEdit.condition !== 'digital') return;
    setIsContentLoading(true);
    loadBookContent(bookToEdit.id)
      .then(text => {
        setFullContent(text ?? '');
        if (text) setBookFileStatus({ ...IDLE, info: `Texto guardado: ${summarize(text)}` });
      })
      .finally(() => setIsContentLoading(false));
  }, [bookToEdit, loadBookContent]);

  const statusSetters = { cover: setCoverStatus, bookFile: setBookFileStatus, sampleFile: setSampleFileStatus };

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>, kind: BookFileKind) => {
    const file = event.target.files?.[0];
    if (!file) return null;
    const error = validateBookFile(file, kind);
    if (!error) return file;
    event.target.value = '';
    statusSetters[kind]({ ...IDLE, error });
    return null;
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = pickFile(event, 'cover');
    if (!file) return;
    setCoverStatus({ ...IDLE, busy: true });
    try {
      setCoverUrl(await prepareCover(file));
      setCoverStatus({ ...IDLE, info: `Portada lista: ${file.name}` });
    } catch (error) {
      event.target.value = '';
      setCoverStatus({ ...IDLE, error: (error as Error).message });
    }
  };

  const handleBookFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = pickFile(event, 'bookFile');
    if (!file) return;
    setBookFileStatus({ ...IDLE, busy: true });
    try {
      const text = await readBookText(file);
      const sizeError = checkContentSize(text);
      if (sizeError) throw new Error(sizeError);
      setFullContent(text);
      setBookFileStatus({ ...IDLE, info: `${file.name}: ${summarize(text)}` });
      if (!sampleText.trim()) {
        setSampleText(takeSample(text, 3000));
        setSampleFileStatus({ ...IDLE, info: 'Usamos el comienzo del libro como muestra. Podés cambiarla.' });
      }
    } catch (error) {
      event.target.value = '';
      setBookFileStatus({ ...IDLE, error: (error as Error).message });
    }
  };

  const handleSampleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = pickFile(event, 'sampleFile');
    if (!file) return;
    setSampleFileStatus({ ...IDLE, busy: true });
    try {
      const text = await readBookText(file);
      const sample = takeSample(text);
      setSampleText(sample);
      setSampleFileStatus({
        ...IDLE,
        info:
          sample.length < text.length
            ? `Muestra cargada de ${file.name}, recortada a ${MAX_SAMPLE_LENGTH.toLocaleString('es-AR')} caracteres.`
            : `Muestra cargada de ${file.name}.`,
      });
    } catch (error) {
      event.target.value = '';
      setSampleFileStatus({ ...IDLE, error: (error as Error).message });
    }
  };

  const handleGenerate = async () => {
    const request = ++aiRequestRef.current;
    setAiError(null);
    setIsGenerating(true);
    try {
      const proposal = await generateBookProposal({
        title,
        author,
        genre,
        language,
        excerpt: sampleText.trim() || fullContent.trim(),
      });
      if (request === aiRequestRef.current) setAiProposal(proposal);
    } catch (error) {
      if (request !== aiRequestRef.current) return;
      setAiProposal(null);
      setAiError(error instanceof Error ? error.message : 'La IA no está disponible en este momento.');
    } finally {
      if (request === aiRequestRef.current) setIsGenerating(false);
    }
  };

  const discardProposal = () => {
    aiRequestRef.current++;
    setAiProposal(null);
    setIsGenerating(false);
  };

  const applyProposal = () => {
    if (!aiProposal) return;
    setDescription(aiProposal.description.trim());
    setGenre(aiProposal.genre);
    setKeywords(current => mergeKeywords(current, aiProposal.keywords));
    setAiProposal(null);
    showToast('Propuesta aplicada. Podés seguir editando antes de guardar.', 'success');
  };

  const validate = (submitForReview: boolean) => {
    if (!title.trim() || !author.trim()) return 'Completá el título y el autor del libro.';
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Ingresá un precio mayor a 0.';
    if (condition !== 'digital' && (!Number.isInteger(Number(stock)) || Number(stock) < 0))
      return 'El stock tiene que ser un número entero, 0 o más.';
    if (condition === 'digital') {
      if (submitForReview && !fullContent.trim())
        return 'Subí el archivo del libro (EPUB o TXT) antes de enviarlo a revisión: es lo que leen los compradores.';
      return checkContentSize(fullContent);
    }
    return null;
  };

  const isBusy = isSubmitting || coverStatus.busy || bookFileStatus.busy || sampleFileStatus.busy || isContentLoading;

  const handleSubmit = async (submitForReview: boolean) => {
    const error = validate(submitForReview);
    setFormError(error);
    if (error) return;
    setIsSubmitting(true);
    try {
      const saved = await saveBook(
        {
          id: bookToEdit?.id,
          title: title.trim(),
          author: author.trim(),
          isbn: isbn.trim(),
          description: description.trim(),
          price: Number(price),
          condition,
          genre,
          language,
          coverUrl,
          pages: Math.round(Number(pages)) || 200,
          publicationYear: Math.round(Number(publicationYear)) || new Date().getFullYear(),
          ...(condition === 'digital' ? {} : { stock: Number(stock) }),
          sampleText: sampleText.trim(),
          keywords,
        },
        submitForReview,
        condition === 'digital' ? fullContent.trim() : undefined,
      );
      if (saved) onClose();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'No pudimos guardar el libro.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ids = Object.fromEntries(
    [
      'title',
      'author',
      'isbn',
      'price',
      'condition',
      'genre',
      'language',
      'amount',
      'year',
      'cover',
      'coverHelp',
      'bookFile',
      'bookFileHelp',
      'sampleFile',
      'sampleFileHelp',
      'description',
      'aiStatus',
      'keywords',
      'sample',
      'content',
    ].map(name => [name, `${fieldId}-${name}`]),
  );

  return (
    <Modal onClose={onClose} labelledBy="book-form-title" className="max-w-3xl bg-white rounded-3xl border-slate-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <BookPlus className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="book-form-title" className="font-bold text-slate-900 text-base">
              {bookToEdit ? 'Editar libro' : 'Publicar nuevo libro'}
            </h3>
            <p className="text-xs text-slate-500">Ficha, portada, archivo del libro y muestra gratuita</p>
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
        {bookToEdit?.status === 'published' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-amber-900">
              Este libro está publicado. Si guardás cambios, vuelve a <strong>En revisión</strong> y un administrador
              tiene que aprobarlo otra vez antes de que reaparezca en el catálogo.
            </p>
          </div>
        )}

        {bookToEdit?.status === 'rejected' && bookToEdit.rejectionReason && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-rose-900 space-y-0.5">
              <p className="font-bold">Motivo del rechazo</p>
              <p className="text-rose-800">{bookToEdit.rejectionReason}</p>
              <p className="text-[11px] text-rose-600 mt-1">Corregí lo indicado antes de volver a enviarlo.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={ids.title} className={LABEL_CLASS}>
              Título *
            </label>
            <input
              id={ids.title}
              required
              maxLength={200}
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Ej.: Rayuela"
              className={`${INPUT_CLASS} font-medium`}
            />
          </div>

          <div>
            <label htmlFor={ids.author} className={LABEL_CLASS}>
              Autor *
            </label>
            <input
              id={ids.author}
              required
              maxLength={120}
              value={author}
              onChange={event => setAuthor(event.target.value)}
              placeholder="Ej.: Julio Cortázar"
              className={`${INPUT_CLASS} font-medium`}
            />
          </div>

          <div>
            <label htmlFor={ids.isbn} className={LABEL_CLASS}>
              ISBN
            </label>
            <input
              id={ids.isbn}
              maxLength={20}
              value={isbn}
              onChange={event => setIsbn(event.target.value)}
              placeholder="978-…"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>

          <div>
            <label htmlFor={ids.price} className={LABEL_CLASS}>
              Precio (USD) *
            </label>
            <input
              id={ids.price}
              type="number"
              step="0.01"
              min="0.01"
              required
              value={price}
              onChange={event => setPrice(event.target.value)}
              className={`${INPUT_CLASS} font-bold`}
            />
          </div>

          <div>
            <label htmlFor={ids.condition} className={LABEL_CLASS}>
              Formato
            </label>
            <select
              id={ids.condition}
              value={condition}
              onChange={event => setCondition(event.target.value as BookCondition)}
              className={INPUT_CLASS}
            >
              <option value="nuevo">Nuevo (físico, con envío)</option>
              <option value="usado">Usado (físico, con envío)</option>
              <option value="digital">Digital (se lee en la web)</option>
            </select>
          </div>

          <div>
            <label htmlFor={ids.genre} className={LABEL_CLASS}>
              Género
            </label>
            <select
              id={ids.genre}
              value={genre}
              onChange={event => setGenre(event.target.value)}
              className={INPUT_CLASS}
            >
              {[...new Set<string>([...BOOK_GENRES, genre])].map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={ids.language} className={LABEL_CLASS}>
              Idioma
            </label>
            <select
              id={ids.language}
              value={language}
              onChange={event => setLanguage(event.target.value)}
              className={INPUT_CLASS}
            >
              {[...new Set<string>([...BOOK_LANGUAGES, language])].map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={ids.amount} className={LABEL_CLASS}>
                {condition === 'digital' ? 'Páginas' : 'Stock'}
              </label>
              <input
                id={ids.amount}
                type="number"
                min={condition === 'digital' ? 1 : 0}
                step="1"
                value={condition === 'digital' ? pages : stock}
                onChange={event => (condition === 'digital' ? setPages : setStock)(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={ids.year} className={LABEL_CLASS}>
                Año
              </label>
              <input
                id={ids.year}
                type="number"
                min="0"
                max="2100"
                value={publicationYear}
                onChange={event => setPublicationYear(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            Archivos
          </h4>

          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={ids.cover} className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Portada
              </label>
              <span className="text-[11px] text-slate-500">
                {BOOK_FILE_LIMITS.cover.label}, hasta {BOOK_FILE_LIMITS.cover.size}
              </span>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-4 items-start">
              <div className="w-20 h-28 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-200">
                {coverUrl && (
                  <img src={coverUrl} alt="Vista previa de la portada" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  id={ids.cover}
                  type="file"
                  accept={acceptFor('cover')}
                  aria-describedby={ids.coverHelp}
                  onChange={handleCoverChange}
                  className={FILE_INPUT_CLASS}
                />
                <FileFeedback status={coverStatus} id={ids.coverHelp} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">O elegí una genérica:</span>
                  {SAMPLE_COVERS.map((cover, index) => (
                    <button
                      type="button"
                      key={cover}
                      aria-label={`Usar portada genérica ${index + 1}`}
                      aria-pressed={coverUrl === cover}
                      onClick={() => {
                        setCoverUrl(cover);
                        setCoverStatus(IDLE);
                      }}
                      className="w-6 h-8 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-emerald-500 aria-pressed:ring-2 aria-pressed:ring-emerald-600"
                    >
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {condition === 'digital' && (
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={ids.bookFile}
                  className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  Archivo del libro *
                </label>
                <span className="text-[11px] text-slate-500">
                  {BOOK_FILE_LIMITS.bookFile.label}, hasta {BOOK_FILE_LIMITS.bookFile.size}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Es el texto que leen los compradores en el lector. Sólo lo ven quienes lo compraron.
              </p>
              <input
                id={ids.bookFile}
                type="file"
                accept={acceptFor('bookFile')}
                aria-describedby={ids.bookFileHelp}
                onChange={handleBookFileChange}
                className={FILE_INPUT_CLASS}
              />
              {isContentLoading ? (
                <p className="text-[11px] text-slate-500">Cargando el texto guardado…</p>
              ) : (
                <FileFeedback status={bookFileStatus} id={ids.bookFileHelp} />
              )}
              <button
                type="button"
                onClick={() => setIsTextEditorOpen(open => !open)}
                aria-expanded={isTextEditorOpen}
                aria-controls={ids.content}
                className="text-[11px] font-semibold text-indigo-700 hover:underline"
              >
                {isTextEditorOpen ? 'Ocultar el texto' : 'Ver o pegar el texto a mano'}
              </button>
              {isTextEditorOpen && (
                <textarea
                  id={ids.content}
                  aria-label="Texto completo del libro"
                  rows={8}
                  value={fullContent}
                  onChange={event => setFullContent(event.target.value)}
                  placeholder="Separá los párrafos con una línea en blanco."
                  className={`${INPUT_CLASS} font-serif`}
                />
              )}
            </div>
          )}

          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={ids.sampleFile}
                className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-amber-600" aria-hidden="true" />
                Muestra gratuita
              </label>
              <span className="text-[11px] text-slate-500">
                {BOOK_FILE_LIMITS.sampleFile.label}, hasta {BOOK_FILE_LIMITS.sampleFile.size}
              </span>
            </div>
            <input
              id={ids.sampleFile}
              type="file"
              accept={acceptFor('sampleFile')}
              aria-describedby={ids.sampleFileHelp}
              onChange={handleSampleFileChange}
              className={FILE_INPUT_CLASS}
            />
            <FileFeedback status={sampleFileStatus} id={ids.sampleFileHelp} />
            <textarea
              id={ids.sample}
              aria-label="Texto de la muestra gratuita"
              rows={4}
              maxLength={MAX_SAMPLE_LENGTH}
              value={sampleText}
              onChange={event => setSampleText(event.target.value)}
              placeholder="Fragmento que cualquiera puede leer antes de comprar. Podés subir un archivo o escribirlo acá."
              className={`${INPUT_CLASS} font-serif`}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={ids.description} className="text-xs font-semibold text-slate-700">
              Sinopsis
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !title.trim()}
              aria-describedby={ids.aiStatus}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isGenerating ? 'Generando…' : aiProposal ? 'Generar otra' : 'Generar con IA'}
            </button>
          </div>
          <div id={ids.aiStatus} aria-live="polite" className="text-[11px]">
            {aiError ? (
              <p role="alert" className="flex items-start gap-1 font-medium text-rose-700">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {aiError} Podés completar la ficha a mano.
              </p>
            ) : (
              !title.trim() && (
                <p className="text-slate-500">
                  Escribí el título y la IA te propone sinopsis, género y palabras clave.
                </p>
              )
            )}
          </div>
          {aiProposal && (
            <AIProposalPanel
              proposal={aiProposal}
              replacesDescription={Boolean(description.trim())}
              onChange={setAiProposal}
              onApply={applyProposal}
              onDiscard={discardProposal}
            />
          )}
          <textarea
            id={ids.description}
            rows={4}
            maxLength={5000}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="De qué trata el libro, en pocas líneas."
            className={`${INPUT_CLASS} resize-y`}
          />
          <div>
            <label htmlFor={ids.keywords} className={LABEL_CLASS}>
              Palabras clave
            </label>
            <p className="mb-2 text-[11px] text-slate-500">
              Ayudan a encontrar el libro en el buscador. Separalas con coma o Enter.
            </p>
            <KeywordsField
              id={ids.keywords}
              listLabel="Palabras clave cargadas"
              keywords={keywords}
              onChange={setKeywords}
              inputClassName={INPUT_CLASS}
            />
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            {formError}
          </p>
        )}
      </div>

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
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" aria-label="Guardando" />}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" aria-hidden="true" />
            Guardar borrador
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Enviar a revisión
          </button>
        </div>
      </div>
    </Modal>
  );
};
