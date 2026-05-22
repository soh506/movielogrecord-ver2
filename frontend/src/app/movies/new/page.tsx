'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Director } from '@/types';
import { fetchWithAuth } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

const DRAFT_KEY = 'movieFormDraft';

function StarSelector({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`text-xs px-2 py-0.5 rounded border ${value === null ? 'bg-gray-200 border-gray-400 text-gray-700' : 'border-gray-300 text-gray-400 hover:bg-gray-50'}`}
      >
        なし
      </button>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-xl leading-none ${star <= (value ?? 0) ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function NewMoviePage() {
  const router = useRouter();
  const [directors, setDirectors] = useState<Director[]>([]);
  const [title, setTitle] = useState('');
  const [directorId, setDirectorId] = useState('');
  const [watchDate, setWatchDate] = useState('');
  const [logText, setLogText] = useState('');
  const [logRating, setLogRating] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) {
      const saved = JSON.parse(draft);
      setTitle(saved.title ?? '');
      setDirectorId(saved.directorId ?? '');
      setWatchDate(saved.watchDate ?? '');
      setLogText(saved.logText ?? '');
      setLogRating(saved.logRating ?? null);
      sessionStorage.removeItem(DRAFT_KEY);
    }
    fetchWithAuth('/directors/')
      .then((data) => setDirectors(data.results ?? data))
      .catch(() => {});
  }, []);

  function handleAddDirector() {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, directorId, watchDate, logText, logRating }));
    router.push('/directors/new?returnTo=/movies/new');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const movie = await fetchWithAuth('/movies/', {
        method: 'POST',
        body: JSON.stringify({ title, director: Number(directorId), watch_date: watchDate }),
      });
      if (logText.trim()) {
        await fetchWithAuth('/logs/', {
          method: 'POST',
          body: JSON.stringify({ text: logText, rating: logRating, movie: movie.id }),
        });
      }
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
                className="text-xs border border-blue-300 text-blue-600 rounded px-2 py-0.5 hover:bg-blue-50 transition-colors"
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

          <hr className="border-gray-100" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">評価（任意）</label>
            <StarSelector value={logRating} onChange={setLogRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">感想（任意）</label>
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              rows={3}
              placeholder="感想を入力..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
