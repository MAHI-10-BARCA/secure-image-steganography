import axios from 'axios';
import type { EncodeResponse, DecodeResponse, AnalyzeResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

export async function encodeMessage(
  coverImage: File,
  message: string,
  password: string
): Promise<EncodeResponse> {
  const form = new FormData();
  form.append('cover_image', coverImage);
  form.append('message', message);
  form.append('password', password);

  const { data } = await api.post<EncodeResponse>('/encode', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function decodeMessage(
  stegoImage: File,
  password: string
): Promise<DecodeResponse> {
  const form = new FormData();
  form.append('stego_image', stegoImage);
  form.append('password', password);

  const { data } = await api.post<DecodeResponse>('/decode', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function analyzeImages(
  coverImage: File,
  stegoImage: File,
  payloadSizeBytes?: number
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append('cover_image', coverImage);
  form.append('stego_image', stegoImage);
  if (payloadSizeBytes !== undefined) {
    form.append('payload_size_bytes', String(payloadSizeBytes));
  }

  const { data } = await api.post<AnalyzeResponse>('/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get('/health');
  return data;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || d).join('; ');
    return err.message || 'Request failed';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
