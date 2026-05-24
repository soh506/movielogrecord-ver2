'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';

function EditDirectorPage() {
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/directors/${params.id}/`)
      .then((data) => { setName(data.name); setInitialLoading(false); })
      .catch(() => { setLoadError(true); setInitialLoading(false); });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetchWithAuth(`/directors/${params.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      router.push('/directors');
    } catch {
      setError('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) return <main className="min-h-screen bg-gray-50"><Spinner /></main>;

  if (loadError) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-red-600 mb-4">データの取得に失敗しました</p>
        <button onClick={() => router.push('/directors')} className="text-sm text-blue-600 hover:underline">
          監督管理に戻る
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">監督を編集</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">監督名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/directors')}
              className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return <AuthGuard><EditDirectorPage /></AuthGuard>;
}
