export interface EncodeMetadata {
  payload_size_bytes: number;
  ciphertext_size_bytes: number;
  overhead_bytes: number;
  theoretical_capacity_bytes: number;
  capacity_used_percent: number;
  bits_embedded: number;
  image_width: number;
  image_height: number;
  original_mode: string;
  mse: number | null;
  psnr_db: number | null;
  psnr_infinite: boolean;
  ssim: number;
  stego_file_size_bytes: number;
}

export interface EncodeResponse {
  success: boolean;
  message: string;
  stego_image_base64: string;
  stego_filename: string;
  metadata: EncodeMetadata;
}

export interface DecodeResponse {
  success: boolean;
  message: string;
  recovered_text: string;
}

export interface AnalyzeMetrics {
  mse: number | null;
  psnr_db: number | null;
  psnr_infinite: boolean;
  ssim: number;
  dimensions: { width: number; height: number };
  theoretical_capacity_bytes: number;
  theoretical_capacity_bits: number;
  payload_size_bytes?: number;
  bits_embedded?: number;
  capacity_used_percent?: number;
}

export interface AnalyzeResponse {
  success: boolean;
  metrics: AnalyzeMetrics;
}

export interface SessionOperation {
  id: string;
  type: 'encode' | 'decode';
  timestamp: string;
  summary: string;
  success: boolean;
}
