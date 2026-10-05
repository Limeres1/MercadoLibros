import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Camera, ScanBarcode, ArrowRight, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

export const BarcodeScannerModal: React.FC = () => {
  const { 
    isBarcodeModalOpen, 
    setIsBarcodeModalOpen, 
    books, 
    setSelectedBookForDetail, 
    showToast,
    setSearchQuery,
    setActiveView
  } = useApp();

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    setScannedResult(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no es soportada en este entorno o navegador.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Check for BarcodeDetector API support
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39']
        });
        const interval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                handleCodeDetected(detectedVal);
                clearInterval(interval);
              }
            } catch (err) {
              // ignore frame errors
            }
          }
        }, 500);
      }
    } catch (err: any) {
      setCameraError('No se pudo acceder a la cámara. Puedes ingresar el código ISBN o probar con los códigos de ejemplo.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (isBarcodeModalOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isBarcodeModalOpen]);

  const handleCodeDetected = (code: string) => {
    setScannedResult(code);
    stopCamera();
    
    // Find matching book by ISBN or ID
    const cleanCode = code.replace(/[- ]/g, '').trim();
    const matchedBook = books.find(b => 
      b.isbn.replace(/[- ]/g, '').includes(cleanCode) || 
      cleanCode.includes(b.isbn.replace(/[- ]/g, ''))
    );

    if (matchedBook) {
      showToast(`¡Libro detectado: "${matchedBook.title}"!`, 'success');
      setTimeout(() => {
        setIsBarcodeModalOpen(false);
        setSelectedBookForDetail(matchedBook);
      }, 700);
    } else {
      showToast(`Código ${code} no coincide con ningún libro registrado.`, 'info');
      setSearchQuery(code);
      setActiveView('catalog');
      setIsBarcodeModalOpen(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIsbn.trim()) return;
    handleCodeDetected(manualIsbn.trim());
  };

  if (!isBarcodeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Escáner de Código de Barras</h3>
              <p className="text-xs text-slate-500">Requisito RF-8: Búsqueda rápida por ISBN</p>
            </div>
          </div>
          <button
            onClick={() => setIsBarcodeModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View Area */}
        <div className="relative bg-slate-900 aspect-4/3 flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Target Scan Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                <div className="w-64 h-36 border-2 border-amber-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-sm"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-sm"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-sm"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-sm"></div>
                  
                  {/* Red Laser Sweep animation */}
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
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-3">Permite el acceso a la cámara para escanear en tiempo real.</p>
              )}
              <button
                onClick={startCamera}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Reintentar Cámara
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

        {/* Manual Input and Demo Shortcuts */}
        <div className="p-4 bg-slate-50 space-y-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ingresa el ISBN manualmente (ej: 978-0307474728)"
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
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

          {/* Quick Demo ISBN buttons */}
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

      </div>
    </div>
  );
};
