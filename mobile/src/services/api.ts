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

export async function loginApi(language: 'en' | 'hi'): Promise<LoginResponse> {
  const resp = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'mobile_user', language }),
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

import type { JobCardListItem, JobCardStatus } from '../types';

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
  fields: { assigned_technician?: string; actual_cost?: number; notes?: string },
): Promise<{ success: boolean; message?: string }> {
  const resp = await fetch(`${API_BASE}/api/job-cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return resp.json();
}
