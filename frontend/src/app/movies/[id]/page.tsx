'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Movie } from '@/types';
import { fetchWithAuth } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/movies/${params.id}/`)
      .then(setMovie)
      .catch(() => router.push('/'));
  }, [params.id, router]);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetchWithAuth(`/movies/${params.id}/`, { method: 'DELETE' });
      router.push('/');
    } catch {
      setLoading(false);
    }
  }

  if (!movie) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-12 px-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← 一覧に戻る
        </Link>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{movie.title}</h1>
          <p className="text-sm text-gray-500 mb-1">監督：{movie.director_name}</p>
          <p className="text-sm text-gray-500 mb-6">視聴日：{movie.watch_date}</p>

          <div className="flex gap-3">
            <Link
              href={`/movies/${movie.id}/edit`}
              className="flex-1 text-center bg-white border border-gray-300 text-gray-700 rounded-md py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              編集
            </Link>
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 bg-red-50 border border-red-300 text-red-600 rounded-md py-2 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              削除
            </button>
          </div>

          {confirming && (
            <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-200">
              <p className="text-sm text-red-700 mb-3">本当に削除しますか？この操作は取り消せません。</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return <AuthGuard><MovieDetailPage /></AuthGuard>;
}
