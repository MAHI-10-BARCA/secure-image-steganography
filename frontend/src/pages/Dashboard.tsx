import { Link } from 'react-router-dom';
import { Lock, Unlock, Shield, ArrowRight, Image, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SessionOperation } from '../types';

const SESSION_KEY = 'stego_session_ops';

export function addSessionOp(op: Omit<SessionOperation, 'id' | 'timestamp'>) {
  const stored = sessionStorage.getItem(SESSION_KEY);
  const ops: SessionOperation[] = stored ? JSON.parse(stored) : [];
  const newOp: SessionOperation = {
    ...op,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  ops.unshift(newOp);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(ops.slice(0, 10)));
}

export default function Dashboard() {
  const [ops, setOps] = useState<SessionOperation[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setOps(JSON.parse(stored));
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-700 border border-navy-600/40 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent-blue/20 text-accent-blue hidden sm:block">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Secure Image Steganography
            </h1>
            <p className="text-slate-300 max-w-2xl leading-relaxed">
              Encrypt a secret message with <strong className="text-accent-blue">AES-256-GCM</strong> and
              hide it inside the least-significant bits of a PNG or BMP image.
              Only someone with the correct password can recover the original text.
            </p>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/hide"
          className="group rounded-xl bg-navy-800 border border-navy-600/40 p-5 hover:border-accent-blue/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent-violet/20 text-accent-violet">
              <Lock size={20} />
            </div>
            <h2 className="font-semibold text-lg">Hide Message</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Encrypt your secret and embed it into a cover image. Download the resulting stego image.
          </p>
          <span className="inline-flex items-center gap-1 text-sm text-accent-blue group-hover:gap-2 transition-all">
            Get started <ArrowRight size={16} />
          </span>
        </Link>

        <Link
          to="/extract"
          className="group rounded-xl bg-navy-800 border border-navy-600/40 p-5 hover:border-accent-cyan/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent-cyan/20 text-accent-cyan">
              <Unlock size={20} />
            </div>
            <h2 className="font-semibold text-lg">Extract Message</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Upload a stego image and enter the password to recover the hidden message.
          </p>
          <span className="inline-flex items-center gap-1 text-sm text-accent-cyan group-hover:gap-2 transition-all">
            Extract now <ArrowRight size={16} />
          </span>
        </Link>
      </section>

      {/* Overview cards */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
          <Key className="text-accent-blue mb-3" size={22} />
          <h3 className="font-semibold mb-1">AES-256-GCM</h3>
          <p className="text-sm text-slate-400">
            Authenticated encryption protects confidentiality and integrity. Tampered data is rejected.
          </p>
        </div>
        <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
          <Image className="text-accent-violet mb-3" size={22} />
          <h3 className="font-semibold mb-1">LSB Steganography</h3>
          <p className="text-sm text-slate-400">
            Secret bits replace the least-significant bit of each RGB channel. Visual change is minimal.
          </p>
        </div>
        <div className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
          <Shield className="text-accent-cyan mb-3" size={22} />
          <h3 className="font-semibold mb-1">Scrypt KDF</h3>
          <p className="text-sm text-slate-400">
            Password is stretched with a random salt so offline attacks are computationally expensive.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
        <h2 className="font-semibold mb-4">Workflow</h2>
        <ol className="grid sm:grid-cols-4 gap-3 text-sm">
          {[
            'Upload cover image (PNG/BMP)',
            'Enter secret + password',
            'Encrypt → embed LSBs → download stego',
            'Later: upload stego + password → recover',
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-slate-300">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Recent operations */}
      {ops.length > 0 && (
        <section className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
          <h2 className="font-semibold mb-3">Recent Operations (this session)</h2>
          <ul className="space-y-2 text-sm">
            {ops.map((op) => (
              <li
                key={op.id}
                className="flex items-center justify-between py-2 border-b border-navy-600/30 last:border-0"
              >
                <span className="text-slate-300">{op.summary}</span>
                <span className={`text-xs ${op.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {op.success ? 'OK' : 'Failed'} · {new Date(op.timestamp).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
