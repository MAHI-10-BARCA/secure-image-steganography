import { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { analyzeImages, getErrorMessage } from '../services/api';
import type { AnalyzeMetrics } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function ImageAnalysis() {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [stegoPreview, setStegoPreview] = useState<string | null>(null);
  const [payloadSize, setPayloadSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AnalyzeMetrics | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const stegoRef = useRef<HTMLInputElement>(null);

  const onCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    setMetrics(null);
  };

  const onStego = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setStegoFile(f);
    setStegoPreview(URL.createObjectURL(f));
    setMetrics(null);
  };

  const handleAnalyze = async () => {
    setError(null);
    if (!coverFile || !stegoFile) {
      setError('Please upload both the original cover and the stego image.');
      return;
    }
    setLoading(true);
    try {
      const size = payloadSize ? parseInt(payloadSize, 10) : undefined;
      const res = await analyzeImages(coverFile, stegoFile, size);
      setMetrics(res.metrics);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const chartData = metrics
    ? [
        { name: 'MSE', value: metrics.mse ?? 0 },
        { name: 'SSIM', value: metrics.ssim },
        {
          name: 'PSNR (norm)',
          value: metrics.psnr_infinite
            ? 1
            : metrics.psnr_db
            ? Math.min(metrics.psnr_db / 100, 1)
            : 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Image Analysis</h1>
        <p className="text-slate-400 text-sm mt-1">
          Compare a cover image with its stego counterpart. Metrics are computed from the actual pixel data.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
          <label className="block text-sm font-medium mb-2">Original Cover Image</label>
          <div
            onClick={() => coverRef.current?.click()}
            className="border-2 border-dashed border-navy-600 rounded-lg p-4 text-center cursor-pointer hover:border-accent-blue/50"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="max-h-40 mx-auto rounded object-contain" />
            ) : (
              <div className="text-slate-400 py-4">
                <Upload className="mx-auto mb-1" size={24} />
                <p className="text-xs">Upload cover</p>
              </div>
            )}
            <input ref={coverRef} type="file" accept="image/png,image/bmp" className="hidden" onChange={onCover} />
          </div>
        </div>

        <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
          <label className="block text-sm font-medium mb-2">Stego Image</label>
          <div
            onClick={() => stegoRef.current?.click()}
            className="border-2 border-dashed border-navy-600 rounded-lg p-4 text-center cursor-pointer hover:border-accent-violet/50"
          >
            {stegoPreview ? (
              <img src={stegoPreview} alt="Stego" className="max-h-40 mx-auto rounded object-contain" />
            ) : (
              <div className="text-slate-400 py-4">
                <Upload className="mx-auto mb-1" size={24} />
                <p className="text-xs">Upload stego</p>
              </div>
            )}
            <input ref={stegoRef} type="file" accept="image/png,image/bmp" className="hidden" onChange={onStego} />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Payload size (bytes, optional)</label>
          <input
            type="number"
            value={payloadSize}
            onChange={(e) => setPayloadSize(e.target.value)}
            placeholder="e.g. 120"
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 bg-accent-violet hover:bg-violet-600 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <BarChart3 size={18} />}
          Analyze
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {metrics && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'MSE', value: metrics.mse?.toFixed(6) ?? '0' },
              {
                label: 'PSNR',
                value: metrics.psnr_infinite
                  ? '∞ dB'
                  : metrics.psnr_db != null
                  ? `${metrics.psnr_db.toFixed(2)} dB`
                  : '—',
              },
              { label: 'SSIM', value: metrics.ssim.toFixed(6) },
              {
                label: 'Capacity',
                value: `${metrics.theoretical_capacity_bytes} B`,
              },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-navy-800 border border-navy-600/40 p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                <p className="text-lg font-semibold text-white">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
            <h3 className="font-semibold mb-3">Additional Statistics</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-400">Dimensions</dt>
              <dd>
                {metrics.dimensions.width} × {metrics.dimensions.height}
              </dd>
              <dt className="text-slate-400">Theoretical capacity (bits)</dt>
              <dd>{metrics.theoretical_capacity_bits}</dd>
              {metrics.payload_size_bytes != null && (
                <>
                  <dt className="text-slate-400">Payload size</dt>
                  <dd>{metrics.payload_size_bytes} B</dd>
                  <dt className="text-slate-400">Bits embedded</dt>
                  <dd>{metrics.bits_embedded}</dd>
                  <dt className="text-slate-400">Capacity used</dt>
                  <dd>{metrics.capacity_used_percent?.toFixed(4)} %</dd>
                </>
              )}
            </dl>
          </div>

          {chartData.length > 0 && (
            <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
              <h3 className="font-semibold mb-3">Metric Overview</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#06b6d4'][i % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
