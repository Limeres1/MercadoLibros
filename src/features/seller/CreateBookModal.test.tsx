import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBookModal } from '@/features/seller/CreateBookModal';

const fake = vi.hoisted(() => ({ saveBook: vi.fn(), showToast: vi.fn(), generateBookProposal: vi.fn() }));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: fake.showToast }) }));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooks: () => ({ loadBookContent: vi.fn() }) }));
vi.mock('@/services/ai', () => ({ askAI: vi.fn(), AIError: class extends Error {} }));
vi.mock('@/features/seller/aiBookProposal', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/seller/aiBookProposal')>()),
  generateBookProposal: fake.generateBookProposal,
}));
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

  describe('D4: AI proposal', () => {
    const proposal = { description: 'Laberintos y espejos.', genre: 'Cuentos', keywords: ['borges', 'laberintos'] };

    const generate = async () => {
      await act(async () => fireEvent.click(screen.getByRole('button', { name: /generar con ia/i })));
    };

    it('needs a title before asking the AI', () => {
      render(<CreateBookModal bookToEdit={null} onClose={vi.fn()} />);
      expect(screen.getByRole('button', { name: /generar con ia/i })).toBeDisabled();
    });

    it('CA-1: the proposal is not in the form or saved until the seller applies it', async () => {
      fake.generateBookProposal.mockResolvedValue(proposal);
      renderForm();
      fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'nuevo' } });
      await generate();

      expect(screen.getByLabelText('Sinopsis')).toHaveValue('');
      await act(async () => fireEvent.click(screen.getByRole('button', { name: /guardar borrador/i })));
      expect(fake.saveBook).toHaveBeenLastCalledWith(
        expect.objectContaining({ description: '', keywords: [] }),
        false,
        undefined,
      );
    });

    it('CA-1: the seller edits the proposal, applies it and can still change it before saving', async () => {
      fake.generateBookProposal.mockResolvedValue(proposal);
      renderForm();
      fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'nuevo' } });
      await generate();

      fireEvent.change(screen.getByLabelText('Sinopsis propuesta'), { target: { value: 'Mi versión.' } });
      fireEvent.click(screen.getByRole('button', { name: 'Quitar laberintos' }));
      fireEvent.click(screen.getByRole('button', { name: /usar propuesta/i }));

      expect(screen.queryByLabelText('Sinopsis propuesta')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Sinopsis')).toHaveValue('Mi versión.');
      expect(screen.getByLabelText('Género')).toHaveValue('Cuentos');

      fireEvent.change(screen.getByLabelText('Palabras clave'), { target: { value: 'Argentina, cuentos' } });
      fireEvent.keyDown(screen.getByLabelText('Palabras clave'), { key: 'Enter' });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: /guardar borrador/i })));
      expect(fake.saveBook).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Mi versión.',
          genre: 'Cuentos',
          keywords: ['borges', 'argentina', 'cuentos'],
        }),
        false,
        undefined,
      );
    });

    it('CA-1: a proposal that arrives after discarding is ignored', async () => {
      let resolveLate: (value: typeof proposal) => void = () => undefined;
      fake.generateBookProposal
        .mockResolvedValueOnce(proposal)
        .mockReturnValueOnce(new Promise(resolve => (resolveLate = resolve)));
      renderForm();
      await generate();
      fireEvent.click(screen.getByRole('button', { name: /generar otra/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
      await act(async () => resolveLate({ ...proposal, description: 'Tarde.' }));

      expect(screen.queryByLabelText('Sinopsis propuesta')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generar con ia/i })).toBeEnabled();
      expect(screen.getByLabelText('Sinopsis')).toHaveValue('');
    });

    it('sends the book text as context for the proposal', async () => {
      fake.generateBookProposal.mockResolvedValue(proposal);
      renderForm();
      fireEvent.change(screen.getByLabelText('Texto de la muestra gratuita'), { target: { value: 'Era una noche.' } });
      await generate();
      expect(fake.generateBookProposal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Ficciones', author: 'Borges', excerpt: 'Era una noche.' }),
      );
    });

    it('CA-2: when the AI fails the seller sees why and the form keeps working by hand', async () => {
      fake.generateBookProposal.mockRejectedValue(new Error('La IA no está disponible en este momento.'));
      const onClose = renderForm();
      fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'nuevo' } });
      await generate();

      expect(screen.getByRole('alert')).toHaveTextContent('Podés completar la ficha a mano');
      fireEvent.change(screen.getByLabelText('Sinopsis'), { target: { value: 'Escrita a mano.' } });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i })));
      expect(fake.saveBook).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Escrita a mano.' }),
        true,
        undefined,
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
