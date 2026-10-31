import { MemoryRouter } from 'react-router';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BarcodeScannerModal } from '@/features/catalog/BarcodeScannerModal';

const fake = vi.hoisted(() => ({
  navigate: vi.fn(),
  getDocs: vi.fn(),
  rememberBooks: vi.fn(),
  showToast: vi.fn(),
}));
vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => fake.navigate,
}));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooks: () => ({ rememberBooks: fake.rememberBooks }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: fake.showToast }) }));
vi.mock('@/services/firestore', () => ({ firestoreRefs: { books: () => 'books' } }));
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
    const detection = deferred<{ rawValue: string }[]>();
    const detect = vi.fn(() => detection.promise);
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        detect = detect;
      },
    );
    renderScanner();
    await act(async () => {});
    const video = screen.getByLabelText('Vista previa de la cámara');
    Object.defineProperty(video, 'readyState', { value: 4 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(detect).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }));
    await act(async () => detection.resolve([{ rawValue: '9780307474728' }]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fake.getDocs).not.toHaveBeenCalled();
    expect(fake.navigate).not.toHaveBeenCalled();
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
