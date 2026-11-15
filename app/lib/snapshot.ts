/**
 * Untuk clientLoader halaman yang di-prerender: ambil data terbaru di browser;
 * kalau gagal (koneksi, Supabase sedang bermasalah), pakai snapshot build lewat
 * `serverLoader` supaya isi yang sudah tampil tidak berubah jadi kosong.
 * Kalau snapshot juga tidak ada, error-nya diteruskan ke ErrorBoundary.
 */
export async function liveOrSnapshot<T>(live: () => Promise<T>, snapshot: () => Promise<T>): Promise<T> {
  try {
    return await live();
  } catch (error) {
    console.error('Data terbaru gagal dimuat, memakai snapshot build:', error);
    return snapshot();
  }
}
