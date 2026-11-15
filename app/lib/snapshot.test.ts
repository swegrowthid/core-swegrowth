import { afterEach, describe, expect, it, vi } from 'vitest';
import { liveOrSnapshot } from './snapshot';

describe('liveOrSnapshot', () => {
  afterEach(() => vi.restoreAllMocks());

  it('data terbaru dipakai kalau berhasil; snapshot tidak disentuh', async () => {
    const snapshot = vi.fn(async () => ['lama']);
    await expect(liveOrSnapshot(async () => ['baru'], snapshot)).resolves.toEqual(['baru']);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('gagal muat: snapshot build dipakai, bukan daftar kosong', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const live = async (): Promise<string[]> => {
      throw new Error('network');
    };
    await expect(liveOrSnapshot(live, async () => ['lama'])).resolves.toEqual(['lama']);
  });

  it('snapshot juga gagal: error diteruskan', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fail = async (): Promise<string[]> => {
      throw new Error('gagal');
    };
    await expect(liveOrSnapshot(fail, fail)).rejects.toThrow('gagal');
  });
});
