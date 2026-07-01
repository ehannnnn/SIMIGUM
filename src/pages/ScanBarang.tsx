import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Scan, Package, RefreshCcw, CheckCircle, Camera, AlertCircle, ChevronDown, Printer, Plus, X, Hash, CheckCircle2, XCircle, AlertTriangle, Info, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { API_URL } from '../config';
const API_BASE = API_URL;
function getSession(): {
  token: string;
  role: string;
  id: number;
  username: string;
} | null {
  try {
    const raw = localStorage.getItem('inventaris_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function getToken(): string {
  return getSession()?.token ?? '';
}
function getRole(): 'ADMIN' | 'PETUGAS' | null {
  try {
    const session = getSession();
    if (!session) return null;
    const raw = (session.role ?? '').toUpperCase().replace(/^ROLE_/, '');
    if (raw === 'ADMIN') return 'ADMIN';
    if (raw.startsWith('PETUGAS')) return 'PETUGAS';
    return null;
  } catch {
    return null;
  }
}
async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers ?? {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      message: res.statusText
    }));
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function getRelasiNama(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.nama || value.namaKategori || value.namaSupplier || '';
}

interface Barang {
  id: number | string;
  kode: string;
  nama: string;
  satuan?: string;
  stok?: number;
  kategori?: string | { nama?: string; namaKategori?: string };
}
interface ScanResult {
  text: string;
  format: string;
}
interface CameraDevice {
  deviceId: string;
  label: string;
}
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}
let toastCounter = 0;
function ToastContainer({
  toasts,
  onRemove
}: {
  toasts: Toast[];
  onRemove: (id: number) => void;
}) {
  const icons: Record<ToastType, JSX.Element> = {
    success: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
  };
  const borders: Record<ToastType, string> = {
    success: 'border-green-200 dark:border-green-500/30',
    error: 'border-red-200 dark:border-red-500/30',
    warning: 'border-yellow-200 dark:border-yellow-500/30',
    info: 'border-blue-200 dark:border-blue-500/30'
  };
  return <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map(t => <div key={t.id} className={`pointer-events-auto flex items-start gap-3 bg-white dark:bg-gray-900 border ${borders[t.type]} rounded-xl shadow-lg p-3.5 animate-in slide-in-from-right-4 fade-in duration-300`}>
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{t.title}</p>
            {t.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.message}</p>}
          </div>
          <button onClick={() => onRemove(t.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>)}
    </div>;
}
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, {
      id,
      type,
      title,
      message
    }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return {
    toasts,
    addToast,
    removeToast
  };
}
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (_) {}
}
function calcEAN13Check(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - sum % 10) % 10;
}
function calcUPCACheck(digits11: string): number {
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += parseInt(digits11[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - sum % 10) % 10;
}
async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 3,
    width: 280,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

function generateBarcodeSVGString(code: string, format: 'EAN13' | 'UPC'): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, code, {
    format,
    lineColor: '#000000',
    background: '#ffffff',
    width: 2,
    height: 80,
    displayValue: true,
    fontSize: 14,
    margin: 10,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 12,
    marginRight: 12,
    fontOptions: '',
    font: 'monospace',
    textAlign: 'center',
    textPosition: 'bottom',
    textMargin: 4,
    valid: () => {}
  });
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}
function generateEAN13SVG(code13: string): string {
  if (!/^\d{13}$/.test(code13)) return '';
  try {
    return generateBarcodeSVGString(code13, 'EAN13');
  } catch {
    return '';
  }
}
function generateUPCAsvg(code12: string): string {
  if (!/^\d{12}$/.test(code12)) return '';
  try {
    return generateBarcodeSVGString(code12, 'UPC');
  } catch {
    return '';
  }
}
async function printQRCode(text: string, label?: string) {
  const dataUrl = await generateQRDataURL(text);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>@page{margin:10mm;size:A4}body{font-family:monospace;background:white}.page{display:flex;flex-wrap:wrap;gap:8mm;justify-content:center;padding:4mm}.label{display:flex;flex-direction:column;align-items:center;border:.5px dashed #ccc;padding:4mm 6mm 3mm;border-radius:2mm;page-break-inside:avoid}.label img{display:block;width:40mm;height:40mm}.type-tag{font-size:7pt;color:#888;margin-top:1mm}.name-tag{font-size:8pt;color:#333;margin-top:1mm;text-align:center;max-width:45mm;word-break:break-word}.code-tag{font-size:6.5pt;color:#aaa;margin-top:1mm;word-break:break-all;max-width:45mm;text-align:center}</style>
  </head><body><div class="page">
  ${Array(20).fill(0).map(() => `<div class="label"><img src="${dataUrl}" alt="QR"/><span class="type-tag">QR Code</span>${label ? `<span class="name-tag">${label}</span>` : ''}<span class="code-tag">${text.length > 30 ? text.slice(0, 27) + '…' : text}</span></div>`).join('')}
  </div><script>window.onload=()=>{window.print()}<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
function printBarcode(svgString: string, type: 'EAN-13' | 'UPC-A', label?: string) {
  if (!svgString) return;
  const encodedSvg = btoa(unescape(encodeURIComponent(svgString)));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>@page{margin:10mm;size:A4}body{font-family:monospace;background:white}.page{display:flex;flex-wrap:wrap;gap:8mm;justify-content:center;padding:4mm}.label{display:flex;flex-direction:column;align-items:center;border:.5px dashed #ccc;padding:4mm 6mm 3mm;border-radius:2mm;page-break-inside:avoid}.label img{display:block;max-width:55mm}.type-tag{font-size:7pt;color:#888;margin-top:1mm}.name-tag{font-size:8pt;color:#333;margin-top:1mm;text-align:center;max-width:55mm;word-break:break-word}</style>
  </head><body><div class="page">
  ${Array(24).fill(0).map(() => `<div class="label"><img src="data:image/svg+xml;base64,${encodedSvg}" alt="barcode"/><span class="type-tag">${type}</span>${label ? `<span class="name-tag">${label}</span>` : ''}</div>`).join('')}
  </div><script>window.onload=()=>{window.print()}<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
const FMT_LABEL: Record<string, string> = {
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  CODE_128: 'Code 128',
  CODE_39: 'Code 39',
  QR_CODE: 'QR Code',
  DATA_MATRIX: 'Data Matrix',
  PDF_417: 'PDF 417',
  ITF: 'ITF',
  CODABAR: 'Codabar'
};
const HINTS = new Map<DecodeHintType, any>();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.ITF, BarcodeFormat.CODABAR]);
HINTS.set(DecodeHintType.TRY_HARDER, true);
HINTS.set(DecodeHintType.ASSUME_GS1, false);
function ModalBackdrop({
  onClose,
  children
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={e => {
    if (e.target === e.currentTarget) onClose();
  }}>
      <div className="my-auto w-full flex items-center justify-center">
        {children}
      </div>
    </div>;
}
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}
function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor = 'bg-red-600 hover:bg-red-700',
  onConfirm,
  onCancel,
  loading
}: ConfirmModalProps) {
  return <ModalBackdrop onClose={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors">
              Batal
            </button>
            <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 ${confirmColor} disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors`}>
              {loading ? 'Memproses…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>;
}
interface StokModalProps {
  barang: Barang;
  tipe: 'masuk' | 'keluar';
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}
function StokModal({
  barang,
  tipe,
  onClose,
  onSuccess,
  onError
}: StokModalProps) {
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    const qty = parseInt(jumlah);
    if (!qty || qty <= 0) {
      onError('Jumlah harus lebih dari 0');
      return;
    }
    setLoading(true);
    try {
      const session = getSession();
      await apiFetch('/transaksi', {
        method: 'POST',
        body: JSON.stringify({
          barang: {
            id: barang.id
          },
          user: {
            id: session?.id
          },
          jenisTransaksi: tipe === 'masuk' ? 'MASUK' : 'KELUAR',
          jumlah: qty,
          keterangan: keterangan || undefined
        })
      });
      onSuccess(`Stok ${tipe === 'masuk' ? 'masuk' : 'keluar'} ${qty} ${barang.satuan ?? 'pcs'} berhasil dicatat!`);
      onClose();
    } catch (err: any) {
      onError(`Gagal: ${err?.message ?? 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };
  return <ModalBackdrop onClose={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tipe === 'masuk' ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-orange-50 dark:bg-orange-500/10'}`}>
              <Package className={`w-4 h-4 ${tipe === 'masuk' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <h2 className="text-sm font-bold">Stok {tipe === 'masuk' ? 'Masuk' : 'Keluar'}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Barang</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{barang.nama}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{barang.kode}</p>
            {barang.stok !== undefined && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stok saat ini: <span className="font-bold text-gray-900 dark:text-white">{barang.stok} {barang.satuan ?? 'pcs'}</span></p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Jumlah *</label>
            <input type="number" min="1" value={jumlah} onChange={e => setJumlah(e.target.value)} placeholder="0" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Keterangan <span className="font-normal">(opsional)</span></label>
            <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Misal: restock bulanan" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors">
              Batal
            </button>
            <button onClick={handleSubmit} disabled={loading || !jumlah} className={`flex-1 py-2.5 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors ${tipe === 'masuk' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {loading ? 'Menyimpan…' : `Simpan ${tipe === 'masuk' ? 'Masuk' : 'Keluar'}`}
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>;
}
interface TambahBarangModalProps {
  initialKode?: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}
function TambahBarangModal({
  initialKode = '',
  onClose,
  onSuccess,
  onError
}: TambahBarangModalProps) {
  const [kode, setKode] = useState(initialKode);
  const [nama, setNama] = useState('');
  const [satuan, setSatuan] = useState('pcs');
  const [stok, setStok] = useState('0');
  const [kategori, setKategori] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validate = () => {
    const e: Record<string, string> = {};
    if (!kode.trim()) e.kode = 'Kode tidak boleh kosong';
    if (!nama.trim()) e.nama = 'Nama tidak boleh kosong';
    return e;
  };
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/barang', {
        method: 'POST',
        body: JSON.stringify({
          kodeBarang: kode.trim(),
          namaBarang: nama.trim(),
          satuan: satuan.trim() || 'pcs',
          stokSaatIni: parseInt(stok) || 0,
          minimumStok: 0,
          kategori: kategori.trim() || undefined
        })
      });
      onSuccess(`Barang "${nama}" berhasil ditambahkan!`);
      onClose();
    } catch (err: any) {
      onError(`Gagal menambah barang: ${err?.message ?? 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };
  return <ModalBackdrop onClose={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-sm font-bold">Tambah Barang Baru</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Kode Barcode *</label>
            <input type="text" value={kode} onChange={e => {
            setKode(e.target.value);
            setErrors(p => ({
              ...p,
              kode: ''
            }));
          }} placeholder="misal: 8991234567890" className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${errors.kode ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`} />
            {errors.kode && <p className="text-xs text-red-500 mt-1">{errors.kode}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Nama Barang *</label>
            <input type="text" value={nama} onChange={e => {
            setNama(e.target.value);
            setErrors(p => ({
              ...p,
              nama: ''
            }));
          }} placeholder="misal: Mie Goreng Spesial" className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${errors.nama ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`} />
            {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Satuan</label>
              <select value={satuan} onChange={e => setSatuan(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500">
                {['pcs', 'kg', 'gram', 'liter', 'ml', 'box', 'karton', 'lusin', 'rim'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Stok Awal</label>
              <input type="number" min="0" value={stok} onChange={e => setStok(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Kategori <span className="font-normal">(opsional)</span></label>
            <input type="text" value={kategori} onChange={e => setKategori(e.target.value)} placeholder="misal: Makanan, Minuman, Elektronik" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors">
              Batal
            </button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan…' : 'Tambah Barang'}
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>;
}
type PrintTab = 'barcode' | 'qr';
interface PrintModalProps {
  onClose: () => void;
  initialCode?: string;
  isAdmin: boolean;
}
function PrintModal({
  onClose,
  initialCode = '',
  isAdmin
}: PrintModalProps) {
  const [activeTab, setActiveTab] = useState<PrintTab>('barcode');
  const [barcodeType, setBarcodeType] = useState<'EAN-13' | 'UPC-A'>('EAN-13');
  const [inputCode, setInputCode] = useState(initialCode);
  const [itemLabel, setItemLabel] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const [previewSvg, setPreviewSvg] = useState('');
  const [qrText, setQrText] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const maxLen = barcodeType === 'EAN-13' ? 12 : 11;
  const handleBarcodeInput = (val: string) => {
    setInputCode(val.replace(/\D/g, '').slice(0, maxLen));
    setBarcodeError('');
    setPreviewSvg('');
  };
  const handleTypeChange = (t: 'EAN-13' | 'UPC-A') => {
    setBarcodeType(t);
    setInputCode('');
    setBarcodeError('');
    setPreviewSvg('');
  };
  const getFullCode = () => {
    if (inputCode.length < maxLen) return '';
    const check = barcodeType === 'EAN-13' ? calcEAN13Check(inputCode) : calcUPCACheck(inputCode);
    return inputCode + check;
  };
  const handleGenerateBarcode = () => {
    setBarcodeError('');
    if (inputCode.length < maxLen) {
      setBarcodeError(`Masukkan ${maxLen} digit (check digit otomatis).`);
      return;
    }
    const full = getFullCode();
    try {
      const svg = barcodeType === 'EAN-13' ? generateEAN13SVG(full) : generateUPCAsvg(full);
      if (!svg) {
        setBarcodeError('Gagal generate barcode. Pastikan format kode benar.');
        return;
      }
      setPreviewSvg(svg);
    } catch (e: any) {
      setBarcodeError(`Error: ${e?.message ?? 'Gagal generate barcode'}`);
    }
  };
  const handlePrintBarcode = () => {
    if (!previewSvg) {
      setBarcodeError('Generate preview dulu.');
      return;
    }
    printBarcode(previewSvg, barcodeType, itemLabel || undefined);
  };
  const handleGenerateQR = async () => {
    setQrError('');
    if (!qrText.trim()) {
      setQrError('Masukkan teks atau URL untuk QR Code.');
      return;
    }
    setQrLoading(true);
    try {
      const url = await generateQRDataURL(qrText.trim());
      setQrPreviewUrl(url);
    } catch (e: any) {
      setQrError(`Gagal generate QR: ${e?.message ?? 'unknown error'}`);
    } finally {
      setQrLoading(false);
    }
  };
  const handlePrintQR = async () => {
    if (!qrPreviewUrl) {
      setQrError('Generate preview dulu.');
      return;
    }
    await printQRCode(qrText.trim(), qrLabel || undefined);
  };
  useEffect(() => {
    if (initialCode.length === 13 && /^\d{13}$/.test(initialCode)) {
      setBarcodeType('EAN-13');
      setInputCode(initialCode.slice(0, 12));
      try {
        setPreviewSvg(generateEAN13SVG(initialCode));
      } catch (_) {}
    } else if (initialCode.length === 12 && /^\d{12}$/.test(initialCode)) {
      setBarcodeType('UPC-A');
      setInputCode(initialCode.slice(0, 11));
      try {
        setPreviewSvg(generateUPCAsvg(initialCode));
      } catch (_) {}
    }
  }, []);
  return <ModalBackdrop onClose={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h2 className="text-sm font-bold">Print Barcode / QR Code</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-4">
          <button onClick={() => setActiveTab('barcode')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeTab === 'barcode' ? 'bg-[#0f4d2f] hover:bg-[#1f6744] text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Hash className="w-3.5 h-3.5" /> Barcode
          </button>
          {isAdmin ? <button onClick={() => setActiveTab('qr')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeTab === 'qr' ? 'bg-[#0f4d2f] hover:bg-[#1f6744] text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <QrCode className="w-3.5 h-3.5" /> QR Code
            </button> : <div className="flex-1 relative group">
              <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed select-none">
                <QrCode className="w-3.5 h-3.5" /> QR Code
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                Fitur khusus Admin
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
              </div>
            </div>}
        </div>

        {activeTab === 'barcode' && <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tipe Barcode</p>
              <div className="grid grid-cols-2 gap-2">
                {(['EAN-13', 'UPC-A'] as const).map(t => <button key={t} onClick={() => handleTypeChange(t)} className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${barcodeType === t ? 'bg-[#0f4d2f] hover:bg-[#1f6744] text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    {t}
                  </button>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Nomor Kode <span className="font-normal">({maxLen} digit — check digit otomatis)</span></p>
              <div className="flex gap-2">
                <input type="text" inputMode="numeric" value={inputCode} onChange={e => handleBarcodeInput(e.target.value)} placeholder={`${maxLen} digit`} maxLength={maxLen} className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
                <button onClick={handleGenerateBarcode} disabled={inputCode.length < maxLen} className="px-4 py-2.5 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors">
                  Preview
                </button>
              </div>
              {barcodeError && <p className="text-xs text-red-500 mt-1.5">{barcodeError}</p>}
              {inputCode.length === maxLen && <p className="text-xs text-gray-400 mt-1">Kode lengkap: <span className="font-mono text-green-600 dark:text-green-400 font-semibold">{getFullCode()}</span></p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Nama Barang <span className="font-normal text-gray-400">(opsional)</span></p>
              <input type="text" value={itemLabel} onChange={e => setItemLabel(e.target.value)} placeholder="misal: Mie Goreng Spesial" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
            {previewSvg && <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preview</p>
                <div className="bg-white rounded-lg p-3 shadow-sm overflow-x-auto max-w-full" dangerouslySetInnerHTML={{
            __html: previewSvg
          }} />
                {itemLabel && <p className="text-xs text-gray-600 dark:text-gray-400 text-center">{itemLabel}</p>}
              </div>}
            <p className="text-[10px] text-gray-400 leading-relaxed"> PDF akan membuka tab baru dengan 24 label per halaman A4 siap cetak.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors">Batal</button>
              <button onClick={handlePrintBarcode} disabled={!previewSvg} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors">
                <Printer className="w-4 h-4" /> Print PDF
              </button>
            </div>
          </div>}

        {activeTab === 'qr' && isAdmin && <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Teks / URL <span className="font-normal">(maks. 200 karakter)</span>
              </p>
              <div className="flex gap-2">
                <input type="text" value={qrText} onChange={e => {
              setQrText(e.target.value);
              setQrError('');
              setQrPreviewUrl('');
            }} placeholder="misal: https://gudang.com/barang/123" maxLength={200} className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
                <button onClick={handleGenerateQR} disabled={!qrText.trim() || qrLoading} className="px-4 py-2.5 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors">
                  {qrLoading ? '…' : 'Preview'}
                </button>
              </div>
              {qrError && <p className="text-xs text-red-500 mt-1.5">{qrError}</p>}
              <p className="text-[10px] text-gray-400 mt-1">{qrText.length}/200 karakter</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Label <span className="font-normal text-gray-400">(opsional)</span>
              </p>
              <input type="text" value={qrLabel} onChange={e => setQrLabel(e.target.value)} placeholder="misal: Rak A3 - Mie Goreng" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
            {qrPreviewUrl && <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preview QR Code</p>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <img src={qrPreviewUrl} alt="QR Code Preview" className="w-40 h-40" />
                </div>
                {qrLabel && <p className="text-xs text-gray-600 dark:text-gray-400 text-center">{qrLabel}</p>}
                <p className="text-[10px] text-gray-400 font-mono text-center break-all max-w-full">{qrText}</p>
              </div>}
            <p className="text-[10px] text-gray-400 leading-relaxed"> PDF akan membuka tab baru dengan 20 label QR per halaman A4 siap cetak.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors">Batal</button>
              <button onClick={handlePrintQR} disabled={!qrPreviewUrl} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors">
                <Printer className="w-4 h-4" /> Print PDF
              </button>
            </div>
          </div>}

      </div>
    </ModalBackdrop>;
}
export default function ScanBarang() {
  const role = getRole();
  const isAdmin = role === 'ADMIN';
  const {
    toasts,
    addToast,
    removeToast
  } = useToast();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [foundBarang, setFoundBarang] = useState<Barang | null>(null);
  const [barangNotFound, setBarangNotFound] = useState(false);
  const [loadingBarang, setLoadingBarang] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printInitCode, setPrintInitCode] = useState('');
  const [showTambahBarang, setShowTambahBarang] = useState(false);
  const [tambahBarangKode, setTambahBarangKode] = useState('');
  const [showStok, setShowStok] = useState<'masuk' | 'keluar' | null>(null);
  const [showConfirmHapus, setShowConfirmHapus] = useState(false);
  const [loadingHapus, setLoadingHapus] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const isDecodingRef = useRef(false);
  const scanStartedAt = useRef<number>(0);
  const lastScannedText = useRef<string>('');
  const lastScannedAt = useRef<number>(0);
  const WARMUP_MS = 800;
  const SCAN_COOLDOWN_MS = 3000;
  const DECODE_INTERVAL_MS = 150;
  const cariBarang = useCallback(async (kode: string) => {
    setLoadingBarang(true);
    setFoundBarang(null);
    setBarangNotFound(false);
    try {
      const data = await apiFetch(`/barang/kode/${encodeURIComponent(kode)}`);
      setFoundBarang({
        id: data.id ?? data.barangId ?? data.idBarang,
        kode: data.kodeBarang,
        nama: data.namaBarang,
        satuan: data.satuan,
        stok: data.stokSaatIni,
        kategori: data.kategori
      });
      console.log('foundBarang id:', data.id);
    } catch (err: any) {
      setBarangNotFound(true);
    } finally {
      setLoadingBarang(false);
    }
  }, []);
  const handleHapusBarang = async () => {
    if (!foundBarang) return;
    setLoadingHapus(true);
    try {
      await apiFetch(`/barang/${foundBarang.id}`, {
        method: 'DELETE'
      });
      addToast('success', 'Barang dihapus', `"${foundBarang.nama}" berhasil dihapus dari database.`);
      setShowConfirmHapus(false);
      setFoundBarang(null);
      setBarangNotFound(false);
      setScanResult(null);
    } catch (err: any) {
      addToast('error', 'Gagal hapus', err?.message ?? 'Terjadi kesalahan');
    } finally {
      setLoadingHapus(false);
    }
  };
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        tmp.getTracks().forEach(t => t.stop());
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter(d => d.kind === 'videoinput').map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Kamera ${i + 1}`
        }));
        setDevices(cams);
        const back = cams.find(c => /back|rear|environment/i.test(c.label));
        const defaultId = back?.deviceId ?? cams[0]?.deviceId ?? '';
        setSelectedId(defaultId);
        if (defaultId) setIsScanning(true);
      } catch (err: any) {
        setCameraError(err?.name === 'NotAllowedError' ? 'Akses kamera ditolak. Berikan izin kamera di browser Anda.' : 'Tidak ada kamera yang terdeteksi.');
      }
    };
    loadDevices();
  }, []);
  const stopCamera = useCallback(() => {
    cancelledRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => {
    if (!isScanning || !selectedId) return;
    cancelledRef.current = false;
    isDecodingRef.current = false;
    let localCancelled = false;
    const start = async () => {
      try {
        const reader = new BrowserMultiFormatReader(HINTS);
        readerRef.current = reader;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: {
              exact: selectedId
            },
            width: {
              ideal: 1280,
              max: 1280
            },
            height: {
              ideal: 720,
              max: 720
            },
            frameRate: {
              ideal: 30,
              max: 30
            }
          }
        });
        if (localCancelled || cancelledRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
          willReadFrequently: true
        })!;
        scanStartedAt.current = Date.now();
        intervalRef.current = setInterval(async () => {
          if (localCancelled || cancelledRef.current) return;
          if (isDecodingRef.current) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const cropW = Math.floor(vw * 0.55);
          const cropH = Math.floor(vh * 0.55);
          canvas.width = cropW;
          canvas.height = cropH;
          ctx.drawImage(video, Math.floor((vw - cropW) / 2), Math.floor((vh - cropH) / 2), cropW, cropH, 0, 0, cropW, cropH);
          isDecodingRef.current = true;
          try {
            const res = await reader.decodeFromCanvas(canvas);
            if (res && !localCancelled && !cancelledRef.current) {
              const text = res.getText();
              const fmt = res.getBarcodeFormat?.()?.toString() ?? 'BARCODE';
              if (fmt === 'EAN_13' && !/^\d{13}$/.test(text)) {
                isDecodingRef.current = false;
                return;
              }
              if (fmt === 'UPC_A' && !/^\d{12}$/.test(text)) {
                isDecodingRef.current = false;
                return;
              }
              const now = Date.now();
              if (now - scanStartedAt.current < WARMUP_MS) {
                isDecodingRef.current = false;
                return;
              }
              if (text === lastScannedText.current && now - lastScannedAt.current < SCAN_COOLDOWN_MS) {
                isDecodingRef.current = false;
                return;
              }
              lastScannedText.current = text;
              lastScannedAt.current = now;
              playBeep();
              setFlashSuccess(true);
              setTimeout(() => setFlashSuccess(false), 500);
              setScanResult({
                text,
                format: fmt
              });
              setIsScanning(false);
              stopCamera();
              cariBarang(text);
            }
          } catch (_) {} finally {
            isDecodingRef.current = false;
          }
        }, DECODE_INTERVAL_MS);
      } catch (err: any) {
        if (localCancelled) return;
        setCameraError(err?.name === 'NotAllowedError' ? 'Akses kamera ditolak.' : err?.name === 'NotFoundError' ? 'Kamera tidak ditemukan.' : `Kamera error: ${err?.message ?? 'tidak diketahui'}`);
      }
    };
    start();
    return () => {
      localCancelled = true;
      stopCamera();
    };
  }, [isScanning, selectedId, stopCamera, cariBarang]);
  const handleReset = () => {
    setScanResult(null);
    setCameraError(null);
    setFlashSuccess(false);
    setFoundBarang(null);
    setBarangNotFound(false);
    setIsScanning(true);
  };
  const handleSelectCamera = (deviceId: string) => {
    setShowDropdown(false);
    if (deviceId === selectedId) return;
    stopCamera();
    setScanResult(null);
    setCameraError(null);
    setFoundBarang(null);
    setBarangNotFound(false);
    setSelectedId(deviceId);
    setTimeout(() => setIsScanning(true), 100);
  };
  const selectedLabel = devices.find(d => d.deviceId === selectedId)?.label ?? 'Pilih Kamera';
  const canPrintScanned = scanResult && (scanResult.format === 'EAN_13' && /^\d{13}$/.test(scanResult.text) || scanResult.format === 'UPC_A' && /^\d{12}$/.test(scanResult.text));
  return <div className="w-full text-gray-900 dark:text-white p-4 md:p-6 bg-transparent">
      <style>{`
        @keyframes scanline{0%{top:4px}50%{top:calc(100% - 4px)}100%{top:4px}}
        .scan-line{animation:scanline 2s linear infinite;position:absolute;left:0;right:0;height:2px;background:#ef4444;box-shadow:0 0 8px 2px rgba(239,68,68,.6)}
        @keyframes slide-in-from-right-4{from{transform:translateX(1rem);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
        .animate-in{animation-fill-mode:both}
        .slide-in-from-right-4{animation-name:slide-in-from-right-4}
        .fade-in{animation-name:fade-in}
        .duration-300{animation-duration:300ms}
      `}</style>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showPrint && <PrintModal onClose={() => setShowPrint(false)} initialCode={printInitCode} isAdmin={isAdmin} />}
      {showTambahBarang && <TambahBarangModal initialKode={tambahBarangKode} onClose={() => setShowTambahBarang(false)} onSuccess={msg => {
      addToast('success', 'Barang ditambahkan', msg);
      setShowTambahBarang(false);
    }} onError={msg => addToast('error', 'Gagal tambah barang', msg)} />}
      {showStok && foundBarang && <StokModal barang={foundBarang} tipe={showStok} onClose={() => setShowStok(null)} onSuccess={msg => {
      addToast('success', `Stok ${showStok} dicatat`, msg);
      setShowStok(null);
      cariBarang(foundBarang.kode);
    }} onError={msg => addToast('error', 'Gagal catat stok', msg)} />}
      {showConfirmHapus && foundBarang && <ConfirmModal title="Hapus Barang?" message={`"${foundBarang.nama}" akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`} confirmLabel="Ya, Hapus" confirmColor="bg-red-600 hover:bg-red-700" onConfirm={handleHapusBarang} onCancel={() => setShowConfirmHapus(false)} loading={loadingHapus} />}

      <div className="max-w-5xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 flex items-center justify-center">
              <Scan className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Scanner Barang</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Untuk scan barang bisa
                {role && <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isAdmin ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                    {role}
                  </span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && <button onClick={() => {
            setPrintInitCode('');
            setShowPrint(true);
          }} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
                <Plus className="w-3 h-3" /> Buat &amp; Print Barcode
              </button>}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${isScanning ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400' : scanResult ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-[#0f4d2f] animate-pulse' : scanResult ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {isScanning ? 'Menunggu Barcode…' : scanResult ? 'Kode Ditemukan' : 'Siap Scan'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 flex flex-col gap-4">

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Pilih Kamera
              </p>
              {devices.length === 0 ? <p className="text-xs text-gray-400 italic">Memuat daftar kamera…</p> : <div className="relative">
                  <button onClick={() => setShowDropdown(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <span className="truncate">{selectedLabel}</span>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showDropdown && <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                      {devices.map(d => <button key={d.deviceId} onClick={() => handleSelectCamera(d.deviceId)} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${d.deviceId === selectedId ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                          {d.label}
                        </button>)}
                      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] text-gray-400">💡 Pakai HP sebagai kamera? Install <span className="font-semibold text-green-600 dark:text-green-400">DroidCam</span> di HP + laptop.</p>
                      </div>
                    </div>}
                </div>}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
              </div>
              <div className="relative bg-black" style={{
              aspectRatio: '4/3'
            }}>
                <video ref={videoRef} className="w-full h-full object-cover" style={{
                display: scanResult || cameraError ? 'none' : 'block'
              }} playsInline muted />
                {flashSuccess && <div className="absolute inset-0 bg-green-400/30 z-30 pointer-events-none" />}
                {isScanning && !cameraError && <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <div className="relative border-2 border-white rounded-lg overflow-hidden" style={{
                  width: '72%',
                  maxWidth: 380,
                  aspectRatio: '3/2'
                }}>
                      <div className="scan-line" />
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                      <span className="text-[11px] font-medium text-white/80 tracking-wider">Arahkan barcode ke dalam kotak</span>
                    </div>
                  </div>}
                {cameraError && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-white/95 dark:bg-gray-900/95">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center mb-4">
                      <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Kamera Tidak Tersedia</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 max-w-xs">{cameraError}</p>
                    <button onClick={handleReset} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      Coba Lagi
                    </button>
                  </div>}
                {!isScanning && scanResult && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95">
                    <div className="flex flex-col items-center gap-4 text-center p-8">
                      <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/30 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">Scan Berhasil!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Format: <span className="text-green-600 dark:text-green-400 font-bold">{FMT_LABEL[scanResult.format] ?? scanResult.format}</span>
                        </p>
                      </div>
                      <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                        <RefreshCcw className="w-4 h-4" /> Scan Ulang
                      </button>
                    </div>
                  </div>}
              </div>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex justify-between">
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex-1 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-bold">Hasil Identifikasi</h3>
              </div>

              {scanResult ? <div className="space-y-4">
                  <span className="inline-flex items-center px-2.5 py-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-xs font-bold text-green-700 dark:text-green-400">
                    {FMT_LABEL[scanResult.format] ?? scanResult.format}
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Kode Terbaca</p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white break-all">{scanResult.text}</span>
                    </div>
                  </div>

                  {loadingBarang && <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Mencari di database…
                    </div>}

                  {barangNotFound && !loadingBarang && <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300">Barang Belum Ada di Gudang</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                            {isAdmin ? 'Barang ini belum terdaftar. Tambahkan terlebih dahulu.' : 'Barang ini belum terdaftar. Hubungi admin untuk menambahkan.'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && <button onClick={() => {
                  setTambahBarangKode(scanResult.text);
                  setShowTambahBarang(true);
                }} className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded-lg transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Tambah Barang Ini
                        </button>}
                    </div>}

                  {foundBarang && !loadingBarang && <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Barang Ditemukan
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{foundBarang.nama}</p>
                      {foundBarang.kategori && <p className="text-xs text-gray-500 dark:text-gray-400">{getRelasiNama(foundBarang.kategori)}</p>}
                      {foundBarang.stok !== undefined && <p className="text-xs text-gray-600 dark:text-gray-300">
                          Stok: <span className="font-bold text-gray-900 dark:text-white">{foundBarang.stok} {foundBarang.satuan ?? 'pcs'}</span>
                        </p>}
                    </div>}

                  {foundBarang && !loadingBarang && <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tindakan</p>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setShowStok('masuk')} className="flex items-center justify-center gap-1 px-3 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-xl transition-colors">
                          + Masuk
                        </button>
                        <button onClick={() => setShowStok('keluar')} className="flex items-center justify-center gap-1 px-3 py-2.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-xl transition-colors">
                          − Keluar
                        </button>
                      </div>

                      {canPrintScanned && isAdmin && <button onClick={() => {
                  setPrintInitCode(scanResult.text);
                  setShowPrint(true);
                }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-sm font-semibold rounded-xl transition-colors">
                          <Printer className="w-4 h-4" /> Print Barcode Ini
                        </button>}

                      {isAdmin && <button onClick={() => setShowConfirmHapus(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl transition-colors">
                          <X className="w-4 h-4" /> Hapus Barang
                        </button>}
                    </div>}

                  {!loadingBarang && <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                      <RefreshCcw className="w-3.5 h-3.5" /> Scan ulang
                    </button>}
                </div> : <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <Scan className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Belum ada hasil</p>
                  <p className="text-xs text-gray-400 mt-1">Scan barcode untuk mulai</p>
                </div>}
            </div>

            {isAdmin && <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h4 className="text-[11px] font-bold text-[#0f4d2f] dark:text-green-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Buat Barcode / QR Code
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Bisa barcode EAN-13/UPC-A atau QR Code. Check digit otomatis, lalu print 20–24 label per A4.
                </p>
                <button onClick={() => {
              setPrintInitCode('');
              setShowPrint(true);
            }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f4d2f] hover:bg-[#1f6744] text-white text-sm font-semibold rounded-xl transition-colors">
                  <Printer className="w-4 h-4" /> Buat &amp; Print
                </button>
              </div>}

            {isAdmin && <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h4 className="text-[11px] font-bold text-[#0f4d2f] dark:text-green-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Tambah Barang 
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Daftarkan barang baru beserta kode, satuan, dan stok awal.
                </p>
                <button onClick={() => {
              setTambahBarangKode('');
              setShowTambahBarang(true);
            }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f4d2f] hover:bg-[#1f6744] text-white text-sm font-semibold rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> Tambah Barang
                </button>
              </div>}

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h4 className="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-3">💡 Tips Scan</h4>
              <ul className="space-y-2.5">
                {['Jarak ideal 8–20 cm dari barcode.', 'Tahan HP diam agar kamera fokus.', 'Pastikan ruangan cukup terang.', 'Barcode miring? Coba putar sedikit.', 'HP sebagai kamera? Pakai DroidCam.'].map((tip, i) => <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {tip}
                  </li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>;
}