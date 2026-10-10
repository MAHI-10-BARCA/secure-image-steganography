export default function About() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">About the Project</h1>
        <p className="text-slate-400 text-sm mt-1">
          Secure Image Steganography Using AES Encryption and LSB Data Hiding
        </p>
      </div>

      <Section title="Abstract">
        <p>
          This project implements a secure steganography system that combines authenticated
          encryption (AES-256-GCM) with least-significant-bit (LSB) image steganography.
          A secret message is first encrypted under a password-derived key; the resulting
          ciphertext, together with cryptographic parameters, is then embedded into the LSBs
          of a PNG or BMP cover image. Extraction recovers the exact payload and decrypts it
          only when the correct password is supplied. Encryption protects confidentiality and
          integrity; steganography attempts to conceal the existence of the message.
        </p>
      </Section>

      <Section title="Problem Statement">
        <p>
          Plaintext messages stored or transmitted in the clear can be read by anyone who
          obtains the file. Even encrypted messages may attract attention if their presence
          is obvious. There is a need for a lightweight, self-contained tool that both
          encrypts sensitive text and hides the resulting ciphertext inside an ordinary-looking
          image, using well-understood cryptographic primitives and a transparent embedding
          algorithm suitable for academic study.
        </p>
      </Section>

      <Section title="Objectives">
        <ul className="list-disc pl-5 space-y-1">
          <li>Encrypt arbitrary UTF-8 messages with AES-256-GCM.</li>
          <li>Derive encryption keys from user passwords using Scrypt.</li>
          <li>Embed the authenticated ciphertext into image LSBs without visible distortion.</li>
          <li>Reliably extract and decrypt the original message given the correct password.</li>
          <li>Provide quantitative image-quality metrics (MSE, PSNR, SSIM).</li>
          <li>Deliver a polished web interface suitable for demonstration and evaluation.</li>
        </ul>
      </Section>

      <Section title="Existing vs Proposed System">
        <p>
          <strong className="text-slate-200">Existing approaches</strong> often either hide
          plaintext (no confidentiality) or use weak ciphers / ECB mode. Many tutorials omit
          authentication, capacity checks, or proper key derivation.
        </p>
        <p className="mt-2">
          <strong className="text-slate-200">Proposed system</strong> uses AES-256-GCM for
          authenticated encryption, Scrypt for password-based key derivation, a documented
          binary payload format with magic header and length field, and deterministic LSB
          embedding restricted to lossless formats (PNG/BMP).
        </p>
      </Section>

      <Section title="AES-256-GCM">
        <p>
          AES-GCM is an authenticated encryption with associated data (AEAD) mode. It provides
          both confidentiality and integrity: any modification of the ciphertext or the nonce
          causes decryption to fail. A 256-bit key, a 96-bit random nonce, and a 128-bit
          authentication tag are used. The tag is appended to the ciphertext by the
          cryptography library.
        </p>
      </Section>

      <Section title="Scrypt Key Derivation">
        <p>
          Scrypt is a memory-hard password-based key derivation function. A random 16-byte salt
          is generated for every encryption. Parameters used: N = 2<sup>14</sup>, r = 8, p = 1,
          output length = 32 bytes. This makes offline dictionary attacks significantly more
          expensive than simple hashing.
        </p>
      </Section>

      <Section title="LSB Steganography">
        <p>
          Each pixel’s red, green and blue channels store 8 bits. Replacing the least-significant
          bit of each channel changes the channel value by at most 1, which is usually
          imperceptible. Bits are written in row-major order (left-to-right, top-to-bottom),
          channel order R-G-B. Only PNG and BMP are accepted because lossy formats such as JPEG
          destroy the embedded LSBs during recompression.
        </p>
        <p className="mt-2 text-amber-200/80 text-sm">
          Note: LSB embedding is not undetectable. Statistical steganalysis or simple bit-plane
          inspection can reveal the presence of hidden data. Image transformations (resize,
          crop, lossy re-encode) will destroy the payload.
        </p>
      </Section>

      <Section title="System Architecture">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Frontend:</strong> React + TypeScript + Vite + Tailwind CSS</li>
          <li><strong>Backend:</strong> FastAPI (Python) with Pillow, NumPy, cryptography, scikit-image</li>
          <li><strong>Communication:</strong> REST API with multipart form uploads</li>
        </ul>
      </Section>

      <Section title="Encoding Algorithm">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Validate image (PNG/BMP), message and password.</li>
          <li>Generate random salt and nonce; derive AES key with Scrypt.</li>
          <li>Encrypt UTF-8 message with AES-256-GCM.</li>
          <li>Build payload: MAGIC ‖ VERSION ‖ SALT ‖ NONCE ‖ CT_LEN ‖ CIPHERTEXT.</li>
          <li>Convert payload to bits and embed into RGB LSBs.</li>
          <li>Save stego image as lossless PNG; compute quality metrics.</li>
        </ol>
      </Section>

      <Section title="Decoding Algorithm">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Validate uploaded stego image.</li>
          <li>Read LSBs in the same order used for embedding.</li>
          <li>Parse and validate header; extract full payload by declared length.</li>
          <li>Recover salt, nonce and ciphertext.</li>
          <li>Derive key from supplied password; decrypt and authenticate.</li>
          <li>Return plaintext only on successful authentication.</li>
        </ol>
      </Section>

      <Section title="Advantages">
        <ul className="list-disc pl-5 space-y-1">
          <li>Strong authenticated encryption (AES-GCM).</li>
          <li>Password-based key derivation with Scrypt.</li>
          <li>Lossless embedding suitable for academic demonstration.</li>
          <li>Clear capacity and quality metrics.</li>
          <li>Modern, responsive web UI.</li>
        </ul>
      </Section>

      <Section title="Limitations">
        <ul className="list-disc pl-5 space-y-1">
          <li>LSB steganography is detectable by statistical analysis.</li>
          <li>Any lossy transformation destroys the payload.</li>
          <li>Capacity is limited to 3 bits per pixel (theoretical).</li>
          <li>Not suitable for high-security covert channels without additional measures.</li>
        </ul>
      </Section>

      <Section title="Applications">
        <ul className="list-disc pl-5 space-y-1">
          <li>Educational demonstration of cryptography + steganography.</li>
          <li>Lightweight confidential note hiding for personal use.</li>
          <li>Research baseline for image-quality impact of LSB embedding.</li>
        </ul>
      </Section>

      <Section title="Future Enhancements">
        <ul className="list-disc pl-5 space-y-1">
          <li>Support for adaptive or edge-based embedding for better security.</li>
          <li>Optional steganalysis resistance techniques.</li>
          <li>Batch processing and larger file support.</li>
          <li>Client-side encryption option for zero-trust scenarios.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-navy-800 border border-navy-600/40 p-5">
      <h2 className="font-semibold text-lg text-white mb-3">{title}</h2>
      <div className="text-sm text-slate-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
