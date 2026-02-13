import Constants from 'expo-constants';

const API_BASE: string =
  (Constants.expoConfig?.extra?.apiBase as string) || 'http://localhost:8021';

export interface LoginResponse {
  success: boolean;
  userId: string;
  sessionId?: string;
  token: string;
  livekitUrl: string;
  message?: string;
}

export async function loginApi(
  language: 'en' | 'hi',
  mode: 'full' | 'transcribe_only' = 'full',
): Promise<LoginResponse> {
  const resp = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'mobile_user', language, mode }),
  });
  return resp.json();
}

export async function logoutApi(userId: string): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

/**
 * Replace localhost in a URL with the API_BASE host.
 * LiveKit URLs returned from the server may contain localhost
 * which won't work from a physical device.
 */
export function resolveUrl(url: string): string {
  if (!url) return url;
  try {
    const apiHost = new URL(API_BASE).hostname;
    return url.replace('localhost', apiHost).replace('127.0.0.1', apiHost);
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Job card execution API
// ---------------------------------------------------------------------------

import type { JobCardListItem, JobCardStatus, ChecklistItem, MediaAnalysis, UploadMediaResponse } from '../types';

export async function fetchJobCards(
  status?: string,
): Promise<{ success: boolean; jobCards: JobCardListItem[] }> {
  const qs = status ? `?status=${status}` : '';
  const resp = await fetch(`${API_BASE}/api/job-cards${qs}`);
  return resp.json();
}

export async function fetchJobCardDetail(
  id: number,
): Promise<{ success: boolean; jobCard: JobCardListItem }> {
  const resp = await fetch(`${API_BASE}/api/job-cards/${id}`);
  return resp.json();
}

export async function updateJobCardStatus(
  id: number,
  status: JobCardStatus,
  notes?: string,
): Promise<{ success: boolean; message?: string }> {
  const resp = await fetch(`${API_BASE}/api/job-cards/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes: notes || '' }),
  });
  return resp.json();
}

export async function updateJobCardFields(
  id: number,
  fields: { assigned_technician?: string; actual_cost?: number; notes?: string; advisor_remarks?: string },
): Promise<{ success: boolean; message?: string }> {
  const resp = await fetch(`${API_BASE}/api/job-cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return resp.json();
}

export async function toggleChecklistItem(
  jobId: number,
  key: string,
  checked: boolean,
): Promise<{ success: boolean; checklist: ChecklistItem[] }> {
  const resp = await fetch(`${API_BASE}/api/job-cards/${jobId}/checklist`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, checked }),
  });
  return resp.json();
}

// ---------------------------------------------------------------------------
// Media upload + VLM analysis
// ---------------------------------------------------------------------------

export async function uploadMedia(
  imageUri: string,
  fileName: string,
  mimeType: string,
  opts?: { customerId?: number; vehicleId?: number; context?: string },
): Promise<UploadMediaResponse> {
  const form = new FormData();
  form.append('file', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as any);
  if (opts?.customerId != null) form.append('customer_id', String(opts.customerId));
  if (opts?.vehicleId != null) form.append('vehicle_id', String(opts.vehicleId));
  if (opts?.context) form.append('context', opts.context);

  const resp = await fetch(`${API_BASE}/api/upload-media`, {
    method: 'POST',
    body: form,
  });
  return resp.json();
}

export async function reanalyzeMedia(
  mediaId: number,
  context: string,
): Promise<UploadMediaResponse> {
  const resp = await fetch(`${API_BASE}/api/media/${mediaId}/reanalyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  return resp.json();
}

export async function fetchMediaAnalyses(
  customerId: number,
  vehicleId?: number,
): Promise<{ success: boolean; analyses: MediaAnalysis[] }> {
  const qs = vehicleId != null ? `?vehicle_id=${vehicleId}` : '';
  const resp = await fetch(`${API_BASE}/api/media/${customerId}${qs}`);
  return resp.json();
}
