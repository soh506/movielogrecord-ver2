'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Director } from '@/types';
import { fetchWithAuth } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

const DRAFT_KEY = 'movieFormDraft';

function NewMoviePage() {
  const router = useRouter();
  const [directors, setDirectors] = useState<Director[]>([]);
  const [title, setTitle] = useState('');
  const [directorId, setDirectorId] = useState('');
  const [watchDate, setWatchDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) {
      const { title, directorId, watchDate } = JSON.parse(draft);
      setTitle(title ?? '');
      setDirectorId(directorId ?? '');
      setWatchDate(watchDate ?? '');
      sessionStorage.removeItem(DRAFT_KEY);
    }

    fetchWithAuth('/directors/')
      .then((data) => setDirectors(data.results ?? data))
      .catch(() => {});
  }, []);

  function handleAddDirector() {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, directorId, watchDate }));
    router.push('/directors/new?returnTo=/movies/new');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetchWithAuth('/movies/', {
        method: 'POST',
        body: JSON.stringify({ title, director: Number(directorId), watch_date: watchDate }),
      });
      router.push('/');
    } catch {
      setError('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">映画を追加</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">監督</label>
              <button
                type="button"
                onClick={handleAddDirector}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                ＋ 監督を追加
              </button>
            </div>
            <select
              value={directorId}
              onChange={(e) => setDirectorId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">選択してください</option>
              {directors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">視聴日</label>
            <input
              type="date"
              value={watchDate}
              onChange={(e) => setWatchDate(e.target.value)}
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
              onClick={() => router.push('/')}
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
  return <AuthGuard><NewMoviePage /></AuthGuard>;
}
