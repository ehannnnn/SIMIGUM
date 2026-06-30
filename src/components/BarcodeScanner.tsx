import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { X, Camera, ChevronDown, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  } catch (_) {}
}

const HINTS = new Map<DecodeHintType, any>();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417, BarcodeFormat.ITF, BarcodeFormat.CODABAR,
]);
HINTS.set(DecodeHintType.TRY_HARDER, true);
HINTS.set(DecodeHintType.ASSUME_GS1, false);

interface CameraDevice { deviceId: string; label: string; }

interface BarcodeScannerProps {
  onScan: (kode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [devices, setDevices]           = useState<CameraDevice[]>([]);
  const [selectedId, setSelectedId]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScanning, setIsScanning]     = useState(false);
  const [cameraError, setCameraError]   = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastResult, setLastResult]     = useState<string | null>(null);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const readerRef     = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const animRef       = useRef<number | null>(null);
  const cancelledRef  = useRef(false);

  const scanStartedAt   = useRef<number>(0);
  const lastScannedText = useRef<string>('');
  const lastScannedAt   = useRef<number>(0);
  const WARMUP_MS        = 1500;
  const SCAN_COOLDOWN_MS = 2500;

  const stopCamera = useCallback(() => {
    cancelledRef.current = true;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (readerRef.current) { try { readerRef.current.reset(); } catch (_) {} readerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { stopCamera(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, stopCamera]);


  const loadDevices = useCallback(async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach(t => t.stop());

      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Kamera ${i + 1}` }));

      setDevices(cams);
      const back = cams.find(c => /back|rear|environment|droidcam/i.test(c.label));
      const def  = back?.deviceId ?? cams[0]?.deviceId ?? '';
      setSelectedId(def);
      if (def) setIsScanning(true);
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Berikan izin kamera di browser Anda.'
          : 'Tidak ada kamera yang terdeteksi.'
      );
    }
  }, []);

  useEffect(() => { loadDevices(); }, []); 

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setShowDropdown(false);
    await loadDevices();
    setIsRefreshing(false);
  };


  useEffect(() => {
    if (!isScanning || !selectedId) return;

    cancelledRef.current = false;
    let localCancelled = false;

    const start = async () => {
      try {
        const reader = new BrowserMultiFormatReader(HINTS);
        readerRef.current = reader;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedId },
            width:  { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
        });

        if (localCancelled || cancelledRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const canvas = document.createElement('canvas');
        const ctx    = canvas.getContext('2d', { willReadFrequently: true })!;
        scanStartedAt.current = Date.now();

        const decode = async () => {
          if (localCancelled || cancelledRef.current) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) {
            animRef.current = requestAnimationFrame(decode); return;
          }

          const vw = video.videoWidth, vh = video.videoHeight;
          const cropW = Math.floor(vw * 0.70), cropH = Math.floor(vh * 0.60);
          canvas.width = cropW; canvas.height = cropH;
          ctx.drawImage(video, Math.floor((vw - cropW) / 2), Math.floor((vh - cropH) / 2), cropW, cropH, 0, 0, cropW, cropH);

          try {
            const res = await reader.decodeFromCanvas(canvas);
            if (res && !localCancelled && !cancelledRef.current) {
              const text = res.getText();
              const fmt  = res.getBarcodeFormat?.()?.toString() ?? 'BARCODE';

              if (fmt === 'EAN_13' && !/^\d{13}$/.test(text)) { animRef.current = requestAnimationFrame(decode); return; }
              if (fmt === 'UPC_A'  && !/^\d{12}$/.test(text)) { animRef.current = requestAnimationFrame(decode); return; }

              const now = Date.now();
              // Guard 1: warmup window
              if (now - scanStartedAt.current < WARMUP_MS) { animRef.current = requestAnimationFrame(decode); return; }
              // Guard 2: same-code cooldown
              if (text === lastScannedText.current && now - lastScannedAt.current < SCAN_COOLDOWN_MS) { animRef.current = requestAnimationFrame(decode); return; }

              lastScannedText.current = text;
              lastScannedAt.current   = now;

              playBeep();
              setFlashSuccess(true);
              setLastResult(text);
              setIsScanning(false);
              stopCamera();

              setTimeout(() => {
                setFlashSuccess(false);
                onScan(text);
                onClose();
              }, 600);
              return;
            }
          } catch (_) {}

          animRef.current = requestAnimationFrame(decode);
        };

        animRef.current = requestAnimationFrame(decode);

      } catch (err: any) {
        if (localCancelled) return;
        setCameraError(
          err?.name === 'NotAllowedError' ? 'Akses kamera ditolak.'
          : err?.name === 'NotFoundError' ? 'Kamera tidak ditemukan.'
          : `Kamera error: ${err?.message ?? 'tidak diketahui'}`
        );
      }
    };

    start();
    return () => { localCancelled = true; stopCamera(); };
  }, [isScanning, selectedId, stopCamera, onScan, onClose]);

  const handleSelectCamera = (deviceId: string) => {
    setShowDropdown(false);
    if (deviceId === selectedId) return;
    stopCamera();
    setCameraError(null);
    setSelectedId(deviceId);
    setTimeout(() => setIsScanning(true), 150);
  };

  const handleRetry = () => {
    setCameraError(null);
    setIsScanning(true);
  };

  const selectedLabel = devices.find(d => d.deviceId === selectedId)?.label ?? 'Pilih Kamera';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { stopCamera(); onClose(); } }}
    >
      <style>{`
        @keyframes scanline {
          0%   { top: 4px; }
          50%  { top: calc(100% - 4px); }
          100% { top: 4px; }
        }
        .bc-scan-line {
          animation: scanline 2s linear infinite;
          position: absolute; left: 0; right: 0;
          height: 2px; background: #ef4444;
          box-shadow: 0 0 8px 2px rgba(239,68,68,0.6);
        }
        @keyframes bcspin { to { transform: rotate(360deg); } }
        .bc-spin { animation: bcspin 0.8s linear infinite; }
      `}</style>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Scan Barcode</p>
              <p className="text-[10px] text-gray-400">Arahkan kamera ke barcode barang</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── Camera selector ── */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <button
                onClick={() => setShowDropdown(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isScanning ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="truncate">{devices.length === 0 ? 'Memuat kamera…' : selectedLabel}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && devices.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                  {devices.map(d => (
                    <button
                      key={d.deviceId}
                      onClick={() => handleSelectCamera(d.deviceId)}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center gap-2
                        ${d.deviceId === selectedId
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.deviceId === selectedId && isScanning ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                      <span className="truncate">{d.label}</span>
                      {d.deviceId === selectedId && <span className="ml-auto text-[9px] font-bold text-green-600 dark:text-green-400">AKTIF</span>}
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-[9px] text-gray-400">
                      💡 DroidCam? Nyalakan dulu, lalu klik Refresh
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleRefresh}
              title="Refresh daftar kamera"
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors flex-shrink-0"
            >
              <RotateCcw className={`w-3 h-3 ${isRefreshing ? 'bc-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Viewport ── */}
        <div className="relative bg-black flex-shrink-0" style={{ aspectRatio: '4/3' }}>

          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: cameraError || flashSuccess ? 'none' : 'block' }}
            playsInline
            muted
          />

          {/* Flash success overlay */}
          {flashSuccess && (
            <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center gap-3">
              <CheckCircle className="w-16 h-16 text-green-400" />
              <p className="text-white font-bold text-sm">Kode Ditemukan!</p>
              {lastResult && <p className="font-mono text-green-300 text-xs bg-black/40 px-3 py-1 rounded-lg">{lastResult}</p>}
            </div>
          )}

          {isScanning && !cameraError && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className="relative" style={{ width: '72%', maxWidth: 300, aspectRatio: '3/2' }}>
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-sm" />              
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-sm" />
                <div className="bc-scan-line" />
              </div>
              <div className="absolute bottom-5 left-0 right-0 text-center">
                <span className="text-[10px] font-medium text-white/70 tracking-wider">
                  Arahkan barcode ke dalam kotak
                </span>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/95 dark:bg-gray-900/95">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Kamera Tidak Tersedia</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xs">{cameraError}</p>
              <div className="flex gap-2">
                <button onClick={handleRetry}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">
                  Coba Lagi
                </button>
                <button onClick={handleRefresh}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                  <RotateCcw className={`w-3 h-3 ${isRefreshing ? 'bc-spin' : ''}`} /> Refresh Kamera
                </button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <span className="text-[9px] text-gray-400 font-mono">EAN-13 · UPC · QR · Code128</span>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Batal
          </button>
        </div>

      </div>
    </div>
  );
}