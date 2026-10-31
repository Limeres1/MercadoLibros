import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowRight, BookOpen, Camera, CheckCircle, ScanBarcode, X } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { paths } from '@/constants/routes';
import { useBooks } from '@/features/catalog/BooksProvider';
import { isbnToken } from '@/lib/searchTokens';
import { firestoreRefs } from '@/services/firestore';

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
}

export const BarcodeScannerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { rememberBooks } = useBooks();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const startingRef = useRef(false);
  const navigationTimerRef = useRef<number | undefined>(undefined);

  const intervalRef = useRef<number | undefined>(undefined);
  const onDetectedRef = useRef<(code: string) => void>(() => undefined);

  const stopCamera = useCallback(() => {
    requestRef.current += 1;
    startingRef.current = false;
    window.clearInterval(intervalRef.current);
    intervalRef.current = undefined;
    window.clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = undefined;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (mountedRef.current) {
      setCameraActive(false);
      setCameraStarting(false);
    }
  }, []);

  const closeScanner = useCallback(() => {
    stopCamera();
    mountedRef.current = false;
    onClose();
  }, [onClose, stopCamera]);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current || startingRef.current) return;
    stopCamera();
    const requestId = ++requestRef.current;
    startingRef.current = true;
    setCameraStarting(true);
    setCameraError(null);
    setScannedResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('La cámara no es soportada en este entorno o navegador.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!mountedRef.current || requestId !== requestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Video element unavailable');
      video.srcObject = stream;
      await video.play();
      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }
      setCameraActive(true);
      setCameraStarting(false);
      startingRef.current = false;

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (Detector) {
        const barcodeDetector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39'] });
        let isDetecting = false;
        intervalRef.current = window.setInterval(async () => {
          if (!mountedRef.current || requestId !== requestRef.current || isDetecting || video.readyState !== 4) return;
          isDetecting = true;
          const barcodes = await barcodeDetector.detect(video).catch(() => []);
          isDetecting = false;
          if (!mountedRef.current || requestId !== requestRef.current) return;
          if (barcodes.length > 0) {
            window.clearInterval(intervalRef.current);
            onDetectedRef.current(barcodes[0].rawValue);
          }
        }, 500);
      }
    } catch {
      if (!mountedRef.current || requestId !== requestRef.current) return;
      stopCamera();
      setCameraError(
        'No se pudo acceder a la cámara. Puedes ingresar el código ISBN o probar con los códigos de ejemplo.',
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const findBookByCode = async (code: string) => {
    const token = isbnToken(code);
    if (!token) return undefined;
    const snapshot = await getDocs(
      query(
        firestoreRefs.books(),
        where('status', '==', 'published'),
        where('searchTokens', 'array-contains', token),
        limit(1),
      ),
    ).catch(() => null);
    return snapshot?.docs[0]?.data();
  };

  const handleCodeDetected = async (code: string) => {
    if (!mountedRef.current) return;
    setScannedResult(code);
    stopCamera();

    const matchedBook = await findBookByCode(code);
    if (!mountedRef.current) return;
    if (matchedBook) {
      rememberBooks([matchedBook]);
      showToast(`¡Libro detectado: "${matchedBook.title}"!`, 'success');
      navigationTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        closeScanner();
        navigate(paths.book(matchedBook.id));
      }, 700);
    } else {
      showToast(`El código ${code} no coincide con ningún libro publicado.`, 'info');
      closeScanner();
      navigate(paths.home(code));
    }
  };

  useEffect(() => {
    onDetectedRef.current = handleCodeDetected;
  });

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualIsbn.trim()) return;
    handleCodeDetected(manualIsbn.trim());
  };

  return (
    <Modal onClose={closeScanner} labelledBy="scanner-title" className="max-w-md bg-white rounded-2xl border-slate-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h3 id="scanner-title" className="font-bold text-slate-900 text-base">
              Escáner de Código de Barras
            </h3>
            <p className="text-xs text-slate-500">Búsqueda rápida por ISBN</p>
          </div>
        </div>
        <button
          onClick={closeScanner}
          aria-label="Cerrar escáner"
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative bg-slate-900 aspect-4/3 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Vista previa de la cámara"
          className={cameraActive ? 'w-full h-full object-contain' : 'hidden'}
        />
        {cameraActive ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
              <div className="w-64 h-36 border-2 border-amber-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-sm"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-sm"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-sm"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-sm"></div>

                <div className="w-full h-0.5 bg-red-500/90 shadow-[0_0_8px_red] absolute top-1/2 -translate-y-1/2 animate-pulse"></div>

                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-amber-300 font-medium whitespace-nowrap bg-black/60 px-2 py-0.5 rounded">
                  Alinea el código de barras aquí
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-6 text-slate-300">
            <Camera className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-60" />
            <p className="text-sm font-medium mb-1">Cámara pausada o no disponible</p>
            {cameraError ? (
              <p className="text-xs text-amber-400 max-w-xs mx-auto mb-3">{cameraError}</p>
            ) : (
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-3">
                Permite el acceso a la cámara para escanear en tiempo real.
              </p>
            )}
            <button
              onClick={startCamera}
              disabled={cameraStarting}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {cameraStarting ? 'Iniciando cámara…' : 'Reintentar Cámara'}
            </button>
          </div>
        )}

        {scannedResult && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-white">
            <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
            <p className="font-bold text-sm">¡Código detectado!</p>
            <p className="text-xs text-amber-300 font-mono mt-1">{scannedResult}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 space-y-4">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Ingresa el ISBN manualmente (ej: 978-0307474728)"
            value={manualIsbn}
            onChange={event => setManualIsbn(event.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
          >
            <span>Buscar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-600" />
            Códigos de prueba del catálogo:
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleCodeDetected('978-0307474728')}
              className="p-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-xs transition-colors group"
            >
              <p className="font-semibold text-slate-800 group-hover:text-amber-800 truncate">Cien años de soledad</p>
              <p className="text-[10px] text-slate-400 font-mono">ISBN: 978-0307474728</p>
            </button>

            <button
              type="button"
              onClick={() => handleCodeDetected('978-0307950925')}
              className="p-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-xs transition-colors group"
            >
              <p className="font-semibold text-slate-800 group-hover:text-amber-800 truncate">Ficciones (Borges)</p>
              <p className="text-[10px] text-slate-400 font-mono">ISBN: 978-0307950925</p>
            </button>

            <button
              type="button"
              onClick={() => handleCodeDetected('978-8420471891')}
              className="p-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-xs transition-colors group"
            >
              <p className="font-semibold text-slate-800 group-hover:text-amber-800 truncate">Rayuela (Cortázar)</p>
              <p className="text-[10px] text-slate-400 font-mono">ISBN: 978-8420471891</p>
            </button>

            <button
              type="button"
              onClick={() => handleCodeDetected('978-0156013864')}
              className="p-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-xs transition-colors group"
            >
              <p className="font-semibold text-slate-800 group-hover:text-amber-800 truncate">El principito</p>
              <p className="text-[10px] text-slate-400 font-mono">ISBN: 978-0156013864</p>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
