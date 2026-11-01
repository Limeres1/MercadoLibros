import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateBookProposal } from '@/features/seller/aiBookProposal';
import { CreateBookModal } from '@/features/seller/CreateBookModal';

const mockShowToast = vi.fn();
const mockSaveBook = vi.fn();
const mockLoadBookContent = vi.fn().mockResolvedValue('Texto de prueba');

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooks: () => ({ loadBookContent: mockLoadBookContent }),
}));

vi.mock('@/features/seller/useSellerBooks', () => ({
  useSellerBooks: () => ({ saveBook: mockSaveBook }),
}));

vi.mock('@/features/seller/aiBookProposal', () => ({
  generateBookProposal: vi.fn(),
}));

describe('CreateBookModal - IA (D4, CA-1, CA-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Generar con IA" button', () => {
    render(<CreateBookModal bookToEdit={null} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /generar con ia/i })).toBeInTheDocument();
  });

  it('asks the user to enter a title if trying to generate with empty title', async () => {
    render(<CreateBookModal bookToEdit={null} onClose={vi.fn()} />);
    const aiButton = screen.getByRole('button', { name: /generar con ia/i });

    fireEvent.click(aiButton);

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('título'), 'error');
    expect(generateBookProposal).not.toHaveBeenCalled();
  });

  it('CA-1: AI proposal is not saved automatically without user confirmation', async () => {
    vi.mocked(generateBookProposal).mockResolvedValueOnce({
      description: 'Una atrapante aventura mágica en el bosque.',
      genre: 'Fantasía',
      keywords: ['magia', 'aventura', 'bosque'],
    });

    render(<CreateBookModal bookToEdit={null} onClose={vi.fn()} />);

    // Rellenar título
    const titleInput = screen.getByPlaceholderText('Ej: Rayuela');
    fireEvent.change(titleInput, { target: { value: 'El Bosque Encantado' } });

    // Clic en Generar con IA
    const aiButton = screen.getByRole('button', { name: /generar con ia/i });
    fireEvent.click(aiButton);

    // Esperar a que aparezca la tarjeta de propuesta
    await waitFor(() => {
      expect(screen.getByText('Propuesta generada por Gemini')).toBeInTheDocument();
    });

    // Verificar que muestra la propuesta
    expect(screen.getByText('#magia')).toBeInTheDocument();
    expect(screen.getByText('#aventura')).toBeInTheDocument();

    // CRUCIAL (CA-1): Verificar que NO se haya guardado el libro en la base de datos automáticamente
    expect(mockSaveBook).not.toHaveBeenCalled();
  });

  it('CA-1: Seller can edit the proposal before applying and saving', async () => {
    vi.mocked(generateBookProposal).mockResolvedValueOnce({
      description: 'Sinopsis preliminar de la IA.',
      genre: 'Policial',
      keywords: ['misterio'],
    });

    render(<CreateBookModal bookToEdit={null} onClose={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText('Ej: Rayuela');
    const authorInput = screen.getByPlaceholderText('Ej: Julio Cortázar');
    fireEvent.change(titleInput, { target: { value: 'Crimen en Palermo' } });
    fireEvent.change(authorInput, { target: { value: 'Autor Detective' } });

    // Generar propuesta
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    await waitFor(() => {
      expect(screen.getByText('Propuesta generada por Gemini')).toBeInTheDocument();
    });

    // Modificar la sinopsis sugerida directamente en el cuadro de propuesta
    const suggestedTextarea = screen.getByDisplayValue('Sinopsis preliminar de la IA.');
    fireEvent.change(suggestedTextarea, { target: { value: 'Sinopsis editada por el vendedor.' } });

    // Aplicar al formulario
    const applyButton = screen.getByRole('button', { name: /aplicar al formulario/i });
    fireEvent.click(applyButton);

    // Ahora la descripción principal del formulario tiene el texto editado
    expect(screen.getByDisplayValue('Sinopsis editada por el vendedor.')).toBeInTheDocument();

    // Guardar borrador explícitamente
    const saveDraftButton = screen.getByRole('button', { name: /guardar borrador/i });
    fireEvent.click(saveDraftButton);

    expect(mockSaveBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Crimen en Palermo',
        description: 'Sinopsis editada por el vendedor.',
        genre: 'Policial',
        keywords: expect.arrayContaining(['misterio']),
      }),
      false,
      expect.any(String),
    );
  });

  it('CA-2: If AI fails, error message is shown and the form continues working manually', async () => {
    vi.mocked(generateBookProposal).mockRejectedValueOnce(
      new Error('No pudimos conectarnos con la IA. Revisá tu conexión.'),
    );

    render(<CreateBookModal bookToEdit={null} onClose={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText('Ej: Rayuela');
    const authorInput = screen.getByPlaceholderText('Ej: Julio Cortázar');
    fireEvent.change(titleInput, { target: { value: 'Libro Manual' } });
    fireEvent.change(authorInput, { target: { value: 'Escritor Independiente' } });

    // Clic en Generar con IA
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    // Se muestra el error al usuario
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('No pudimos conectarnos con la IA. Revisá tu conexión.', 'error');
    });

    // El formulario sigue funcionando a mano (CA-2)
    const descTextarea = screen.getByPlaceholderText(/escribe la reseña descriptiva/i);
    fireEvent.change(descTextarea, { target: { value: 'Sinopsis escrita a mano sin problemas.' } });

    // Se puede guardar a mano normalmente
    fireEvent.click(screen.getByRole('button', { name: /guardar borrador/i }));

    expect(mockSaveBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Libro Manual',
        description: 'Sinopsis escrita a mano sin problemas.',
      }),
      false,
      expect.any(String),
    );
  });
});
