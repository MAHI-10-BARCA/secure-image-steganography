import { useState, useRef, useCallback } from 'react';
import { Upload, Eye, EyeOff, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { encodeMessage, getErrorMessage } from '../services/api';
import type { EncodeMetadata } from '../types';
import { addSessionOp } from './Dashboard';

export default function HideMessage() {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stegoBase64, setStegoBase64] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<EncodeMetadata | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setStegoBase64(null);
    setMetadata(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const estimatedMsgBytes = new TextEncoder().encode(message).length;
  // Rough capacity estimate: assume image is loaded; we show after encode

  const handleEncode = async () => {
    setError(null);
    if (!coverFile) {
      setError('Please upload a cover image (PNG or BMP).');
      return;
    }
    if (!message.trim()) {
      setError('Message cannot be empty.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await encodeMessage(coverFile, message, password);
      setStegoBase64(res.stego_image_base64);
      setMetadata(res.metadata);
      addSessionOp({
        type: 'encode',
        summary: `Encoded ${res.metadata.payload_size_bytes} B payload into ${res.metadata.image_width}×${res.metadata.image_height} image`,
        success: true,
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      addSessionOp({
        type: 'encode',
        summary: 'Encoding failed',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadStego = () => {
    if (!stegoBase64) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${stegoBase64}`;
    link.download = 'stego_image.png';
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hide Message</h1>
        <p className="text-slate-400 text-sm mt-1">
          Encrypt a secret message and embed it into the LSBs of a cover image.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: inputs */}
        <div className="space-y-5">
          {/* Image upload */}
          <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
            <label className="block text-sm font-medium mb-2">Cover Image (PNG / BMP)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-navy-600 rounded-lg p-6 text-center cursor-pointer hover:border-accent-blue/50 transition-colors"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Cover preview"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
              ) : (
                <div className="text-slate-400">
                  <Upload className="mx-auto mb-2" size={28} />
                  <p className="text-sm">Click to upload PNG or BMP</p>
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
            {coverFile && (
              <p className="text-xs text-slate-400 mt-2">
                {coverFile.name} · {(coverFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {/* Message */}
          <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
            <label className="block text-sm font-medium mb-2">Secret Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Enter the text you want to hide…"
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-y"
            />
            <p className="text-xs text-slate-400 mt-1">
              Approx. {estimatedMsgBytes} bytes (UTF-8)
            </p>
          </div>

          {/* Password */}
          <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  placeholder="Min. 4 characters"
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
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
            </div>
          </div>

          <button
            onClick={handleEncode}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Encrypting & Embedding…
              </>
            ) : (
              'Encrypt & Hide Message'
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right: result */}
        <div className="space-y-5">
          {stegoBase64 && metadata ? (
            <>
              <div className="rounded-xl bg-navy-800 border border-emerald-500/30 p-5">
                <div className="flex items-center gap-2 text-emerald-400 mb-3">
                  <CheckCircle2 size={20} />
                  <span className="font-medium">Stego image ready</span>
                </div>
                <img
                  src={`data:image/png;base64,${stegoBase64}`}
                  alt="Stego preview"
                  className="max-h-56 mx-auto rounded-lg object-contain mb-4"
                />
                <button
                  onClick={downloadStego}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  <Download size={18} /> Download Stego PNG
                </button>
              </div>

              <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
                <h3 className="font-semibold mb-3">Encoding Metrics</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-400">Payload size</dt>
                  <dd>{metadata.payload_size_bytes} B</dd>
                  <dt className="text-slate-400">Capacity</dt>
                  <dd>{metadata.theoretical_capacity_bytes} B</dd>
                  <dt className="text-slate-400">Capacity used</dt>
                  <dd>{metadata.capacity_used_percent?.toFixed(3)} %</dd>
                  <dt className="text-slate-400">Bits embedded</dt>
                  <dd>{metadata.bits_embedded}</dd>
                  <dt className="text-slate-400">Dimensions</dt>
                  <dd>
                    {metadata.image_width} × {metadata.image_height}
                  </dd>
                  <dt className="text-slate-400">MSE</dt>
                  <dd>{metadata.mse?.toFixed(6) ?? '—'}</dd>
                  <dt className="text-slate-400">PSNR</dt>
                  <dd>
                    {metadata.psnr_infinite
                      ? '∞ dB'
                      : metadata.psnr_db != null
                      ? `${metadata.psnr_db.toFixed(2)} dB`
                      : '—'}
                  </dd>
                  <dt className="text-slate-400">SSIM</dt>
                  <dd>{metadata.ssim?.toFixed(6)}</dd>
                  <dt className="text-slate-400">Stego file size</dt>
                  <dd>{(metadata.stego_file_size_bytes / 1024).toFixed(1)} KB</dd>
                </dl>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-8 text-center text-slate-500">
              <p className="text-sm">Stego image and metrics will appear here after encoding.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
