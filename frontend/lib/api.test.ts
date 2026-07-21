import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, apiFetch } from '@/lib/api';

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'clinic_csrf=; Max-Age=0; path=/';
  });

  it('uses same-origin credentials and sends CSRF on mutations', async () => {
    document.cookie = 'clinic_csrf=test-csrf; path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    await apiFetch('/appointments', { method: 'POST', body: '{}' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/appointments',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf' })
      })
    );
  });

  it('preserves structured API error details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'slot_unavailable', message: 'Choose another time.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await expect(apiFetch('/appointments')).rejects.toMatchObject<ApiClientError>({
      code: 'slot_unavailable',
      message: 'Choose another time.',
      status: 409
    });
  });
});
