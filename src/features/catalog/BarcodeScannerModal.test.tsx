import { MemoryRouter } from 'react-router';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BarcodeScannerModal } from '@/features/catalog/BarcodeScannerModal';

const fake = vi.hoisted(() => ({
  navigate: vi.fn(),
  getDocs: vi.fn(),
  rememberBooks: vi.fn(),
  showToast: vi.fn(),
  createDecoder: vi.fn(),
  detect: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => fake.navigate,
}));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooks: () => ({ rememberBooks: fake.rememberBooks }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: fake.showToast }) }));
vi.mock('@/services/firestore', () => ({ firestoreRefs: { books: () => 'books' } }));
vi.mock('@/services/barcodeDecoder', () => ({ createBarcodeDecoder: () => fake.createDecoder() }));
vi.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => fake.getDocs(...args),
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => args,
  limit: (count: number) => count,
}));

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

const mediaStream = () => {
  const stop = vi.fn();
  return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
};
const getUserMedia = vi.fn();
const close = vi.fn();
let play: ReturnType<typeof vi.spyOn>;

const renderScanner = () =>
  render(
    <MemoryRouter>
      <BarcodeScannerModal onClose={close} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fake.getDocs.mockReset().mockResolvedValue({ docs: [] });
  getUserMedia.mockReset().mockResolvedValue(mediaStream().stream);
  fake.detect.mockReset().mockResolvedValue(null);
  fake.dispose.mockClear();
  fake.createDecoder.mockReset().mockResolvedValue({ detect: fake.detect, dispose: fake.dispose });
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { mediaDevices: { getUserMedia } }));
  vi.stubGlobal('BarcodeDetector', undefined);
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('scanner camera lifecycle', () => {
  it('attaches the stream to an existing video before playing and stops every track on close', async () => {
    const { stream, stop } = mediaStream();
    getUserMedia.mockResolvedValue(stream);
    play.mockImplementation(function (this: HTMLVideoElement) {
      expect(this.isConnected).toBe(true);
      expect(this.srcObject).toBe(stream);
      return Promise.resolve();
    });
    renderScanner();
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    const video = screen.getByLabelText('Vista previa de la cámara') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each(['close', 'unmount'])(
    'stops a late permission result after %s instead of restarting the camera',
    async action => {
      const permission = deferred<MediaStream>();
      const { stream, stop } = mediaStream();
      getUserMedia.mockReturnValue(permission.promise);
      const view = renderScanner();
      if (action === 'close') fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
      else view.unmount();
      await act(async () => permission.resolve(stream));
      expect(stop).toHaveBeenCalledTimes(1);
      expect(play).not.toHaveBeenCalled();
    },
  );

  it.each(['escape', 'backdrop'])('stops the camera when closing by %s', async action => {
    const { stream, stop } = mediaStream();
    getUserMedia.mockResolvedValue(stream);
    renderScanner();
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    if (action === 'escape') fireEvent.keyDown(window, { key: 'Escape' });
    else fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not start overlapping requests while permission is pending', async () => {
    const permission = deferred<MediaStream>();
    getUserMedia.mockReturnValue(permission.promise);
    renderScanner();
    const pending = screen.getByRole('button', { name: 'Iniciando cámara…' });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    await act(async () => permission.resolve(mediaStream().stream));
  });

  it('allows retry after permission denial and keeps manual input available', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValue(mediaStream().stream);
    renderScanner();
    const retry = await screen.findByRole('button', { name: 'Reintentar Cámara' });
    expect(screen.getByPlaceholderText(/Ingresa el ISBN manualmente/)).toBeEnabled();
    fireEvent.click(retry);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('releases the stream if video playback fails', async () => {
    const { stream, stop } = mediaStream();
    getUserMedia.mockResolvedValue(stream);
    play.mockRejectedValue(new Error('Playback failed'));
    renderScanner();
    await screen.findByRole('button', { name: 'Reintentar Cámara' });
    expect(stop).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('Vista previa de la cámara') as HTMLVideoElement).srcObject).toBeNull();
  });

  it('ignores a pending detector result after close and does not search or navigate', async () => {
    vi.useFakeTimers();
    const detection = deferred<string | null>();
    const detect = vi.fn(() => detection.promise);
    fake.createDecoder.mockResolvedValue({ detect, dispose: fake.dispose });
    renderScanner();
    await act(async () => {});
    const video = screen.getByLabelText('Vista previa de la cámara');
    Object.defineProperty(video, 'readyState', { value: 4 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(detect).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    await act(async () => detection.resolve('9780307474728'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fake.getDocs).not.toHaveBeenCalled();
    expect(fake.navigate).not.toHaveBeenCalled();
    expect(fake.dispose).toHaveBeenCalled();
  });

  it('disposes a decoder that finishes loading after the scanner closes', async () => {
    const decoder = deferred<{ detect: typeof fake.detect; dispose: typeof fake.dispose }>();
    fake.createDecoder.mockReturnValue(decoder.promise);
    renderScanner();
    await waitFor(() => expect(fake.createDecoder).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    await act(async () => decoder.resolve({ detect: fake.detect, dispose: fake.dispose }));
    expect(fake.dispose).toHaveBeenCalledTimes(1);
    expect(fake.detect).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('cancels delayed navigation when the modal closes after a successful lookup', async () => {
    vi.useFakeTimers();
    fake.getDocs.mockResolvedValue({ docs: [{ data: () => ({ id: 'book', title: 'Libro' }) }] });
    renderScanner();
    await act(async () => {});
    fireEvent.change(screen.getByPlaceholderText(/Ingresa el ISBN manualmente/), {
      target: { value: '9780307474728' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    });
    expect(fake.rememberBooks).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fake.navigate).not.toHaveBeenCalled();
  });
});

describe('manual ISBN lookup', () => {
  const submit = (value: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: 'ISBN' }), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  };

  it.each(['', '123', '9780307474729', '0307474721', 'https://example.com/9780307474728'])(
    'rejects %s before contacting the catalog and keeps the input editable',
    async value => {
      renderScanner();
      await waitFor(() => expect(play).toHaveBeenCalled());
      submit(value);
      expect(screen.getByRole('alert')).toHaveTextContent('ISBN válido');
      expect(screen.getByRole('textbox', { name: 'ISBN' })).toBeEnabled();
      expect(fake.getDocs).not.toHaveBeenCalled();
      expect(fake.navigate).not.toHaveBeenCalled();
    },
  );

  it.each(['978-0 307-47472-8', '0-307-47472-0'])(
    'normalizes %s and searches both ISBN representations without requiring a camera',
    async value => {
      getUserMedia.mockRejectedValue(new Error('Permission denied'));
      fake.getDocs.mockResolvedValue({ docs: [{ data: () => ({ id: 'book', title: 'Libro' }) }] });
      renderScanner();
      await screen.findByRole('button', { name: 'Reintentar Cámara' });
      submit(value);
      await waitFor(() => expect(fake.rememberBooks).toHaveBeenCalledTimes(1));
      const criteria = fake.getDocs.mock.calls[0][0];
      const isbnFilter = criteria.find((entry: unknown) => Array.isArray(entry) && entry[0] === 'searchTokens');
      expect(isbnFilter.slice(0, 2)).toEqual(['searchTokens', 'array-contains-any']);
      expect(isbnFilter[2]).toEqual(expect.arrayContaining(['9780307474728', '0307474720']));
      expect(criteria).toContainEqual(['status', '==', 'published']);
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    },
  );

  it('distinguishes an absent book from a failed request and allows correction', async () => {
    renderScanner();
    await waitFor(() => expect(play).toHaveBeenCalled());
    submit('9780307474728');
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos un libro publicado');
    expect(fake.navigate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'ISBN' }), { target: { value: '0307474720' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the ISBN after a catalog error and lets the user retry', async () => {
    fake.getDocs.mockRejectedValueOnce(new Error('unavailable'));
    renderScanner();
    await waitFor(() => expect(play).toHaveBeenCalled());
    submit('9780307474728');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar el catálogo');
    expect(screen.getByRole('textbox', { name: 'ISBN' })).toHaveValue('9780307474728');
    expect(fake.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos un libro publicado');
    expect(fake.getDocs).toHaveBeenCalledTimes(2);
  });

  it('blocks duplicate submissions and ignores a lookup that completes after close', async () => {
    const lookup = deferred<{ docs: { data: () => { id: string; title: string } }[] }>();
    fake.getDocs.mockReturnValue(lookup.promise);
    renderScanner();
    await waitFor(() => expect(play).toHaveBeenCalled());
    submit('9780307474728');
    const searching = screen.getByRole('button', { name: 'Buscando…' });
    expect(searching).toBeDisabled();
    fireEvent.click(searching);
    fireEvent.click(screen.getByRole('button', { name: 'Cien años de soledad ISBN: 978-0307474728' }));
    expect(fake.getDocs).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    await act(async () => lookup.resolve({ docs: [{ data: () => ({ id: 'book', title: 'Libro' }) }] }));
    expect(fake.rememberBooks).not.toHaveBeenCalled();
    expect(fake.navigate).not.toHaveBeenCalled();
    expect(fake.showToast).not.toHaveBeenCalled();
  });
});
