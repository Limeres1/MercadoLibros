import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBookModal } from '@/features/seller/CreateBookModal';

const fake = vi.hoisted(() => ({ saveBook: vi.fn(), showToast: vi.fn() }));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: fake.showToast }) }));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooks: () => ({ loadBookContent: vi.fn() }) }));
vi.mock('@/features/seller/useSellerBooks', () => ({ useSellerBooks: () => ({ saveBook: fake.saveBook }) }));

const renderForm = () => {
  const onClose = vi.fn();
  render(<CreateBookModal bookToEdit={null} onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Ficciones' } });
  fireEvent.change(screen.getByLabelText('Autor *'), { target: { value: 'Borges' } });
  fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'digital' } });
  return onClose;
};

describe('CreateBookModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.saveBook.mockResolvedValue(true);
  });

  it('CA-1: rejects a PDF book file with a clear message', () => {
    renderForm();
    const pdf = new File(['%PDF'], 'libro.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Archivo del libro *'), { target: { files: [pdf] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Exportá el libro a EPUB o TXT');
  });

  it('does not send a digital book to review without its text', async () => {
    renderForm();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i })));
    expect(screen.getByRole('alert')).toHaveTextContent('Subí el archivo del libro');
    expect(fake.saveBook).not.toHaveBeenCalled();
  });

  it('loads the uploaded text, uses its beginning as the sample and sends it to review', async () => {
    const onClose = renderForm();
    const txt = new File(['Capítulo 1\n\nEra una noche oscura.'], 'libro.txt', { type: 'text/plain' });
    await act(async () => fireEvent.change(screen.getByLabelText('Archivo del libro *'), { target: { files: [txt] } }));
    expect(await screen.findByText(/libro\.txt: 6 palabras · 1 páginas en el lector/)).toBeInTheDocument();
    expect(screen.getByLabelText('Texto de la muestra gratuita')).toHaveValue('Capítulo 1\n\nEra una noche oscura.');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i })));
    expect(fake.saveBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ficciones', condition: 'digital' }),
      true,
      'Capítulo 1\n\nEra una noche oscura.',
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the form open when saving fails', async () => {
    fake.saveBook.mockResolvedValue(false);
    const onClose = renderForm();
    fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'nuevo' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /guardar borrador/i })));
    expect(fake.saveBook).toHaveBeenCalledWith(expect.objectContaining({ stock: 10 }), false, undefined);
    expect(onClose).not.toHaveBeenCalled();
  });
});
