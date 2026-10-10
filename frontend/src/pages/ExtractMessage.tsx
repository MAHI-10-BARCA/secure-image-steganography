import { useState, useRef } from 'react';
import { Upload, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';
import { decodeMessage, getErrorMessage } from '../services/api';
import { addSessionOp } from './Dashboard';

export default function ExtractMessage() {
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStegoFile(file);
    setRecovered(null);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDecode = async () => {
    setError(null);
    setRecovered(null);
    if (!stegoFile) {
      setError('Please upload a stego image.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await decodeMessage(stegoFile, password);
      setRecovered(res.recovered_text);
      addSessionOp({
        type: 'decode',
        summary: `Successfully recovered message (${res.recovered_text.length} chars)`,
        success: true,
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      addSessionOp({
        type: 'decode',
        summary: 'Extraction / decryption failed',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!recovered) return;
    await navigator.clipboard.writeText(recovered);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Extract Message</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a stego image and enter the password to recover the hidden message.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
            <label className="block text-sm font-medium mb-2">Stego Image</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-navy-600 rounded-lg p-6 text-center cursor-pointer hover:border-accent-cyan/50 transition-colors"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Stego preview"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
              ) : (
                <div className="text-slate-400">
                  <Upload className="mx-auto mb-2" size={28} />
                  <p className="text-sm">Click to upload stego PNG / BMP</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/bmp,.png,.bmp"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            {stegoFile && (
              <p className="text-xs text-slate-400 mt-2">
                {stegoFile.name} · {(stegoFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
            <label className="block text-sm font-medium mb-2">Decryption Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
                placeholder="Enter the password used during encoding"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleDecode}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-cyan hover:bg-cyan-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Extracting & Decrypting…
              </>
            ) : (
              'Extract & Decrypt'
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div>
          {recovered !== null ? (
            <div className="rounded-xl bg-navy-800 border border-emerald-500/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={20} />
                  <span className="font-medium">Message recovered</span>
                </div>
                <button
                  onClick={copyText}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-navy-700 px-2 py-1 rounded"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="bg-navy-900 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap break-words max-h-80 overflow-auto">
                {recovered}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-8 text-center text-slate-500">
              <p className="text-sm">Recovered message will appear here after successful decryption.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
