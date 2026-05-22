'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Movie, Log } from '@/types';
import { fetchWithAuth } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

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

function StarDisplay({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-gray-400">評価なし</span>;
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [newLogText, setNewLogText] = useState('');
  const [newLogRating, setNewLogRating] = useState<number | null>(null);
  const [addingLog, setAddingLog] = useState(false);

  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLogText, setEditLogText] = useState('');
  const [editLogRating, setEditLogRating] = useState<number | null>(null);

  function loadMovie() {
    fetchWithAuth(`/movies/${params.id}/`).then(setMovie).catch(() => router.push('/'));
  }

  useEffect(() => { loadMovie(); }, [params.id]);

  async function handleDeleteMovie() {
    setDeleteLoading(true);
    try {
      await fetchWithAuth(`/movies/${params.id}/`, { method: 'DELETE' });
      router.push('/');
    } catch {
      setDeleteLoading(false);
    }
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchWithAuth('/logs/', {
        method: 'POST',
        body: JSON.stringify({ text: newLogText, rating: newLogRating, movie: Number(params.id) }),
      });
      setNewLogText('');
      setNewLogRating(null);
      setAddingLog(false);
      loadMovie();
    } catch {}
  }

  function startEditLog(log: Log) {
    setEditingLogId(log.id);
    setEditLogText(log.text);
    setEditLogRating(log.rating);
  }

  async function handleEditLog(e: React.FormEvent, logId: number) {
    e.preventDefault();
    try {
      await fetchWithAuth(`/logs/${logId}/`, {
        method: 'PUT',
        body: JSON.stringify({ text: editLogText, rating: editLogRating, movie: Number(params.id) }),
      });
      setEditingLogId(null);
      loadMovie();
    } catch {}
  }

  async function handleDeleteLog(logId: number) {
    try {
      await fetchWithAuth(`/logs/${logId}/`, { method: 'DELETE' });
      loadMovie();
    } catch {}
  }

  if (!movie) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-12 px-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← 一覧に戻る
        </Link>

        {/* 映画情報 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
                  onClick={handleDeleteMovie}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? '削除中...' : '削除する'}
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

        {/* 視聴ログ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">視聴ログ</h2>
            {!addingLog && (
              <button
                onClick={() => setAddingLog(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ＋ ログを追加
              </button>
            )}
          </div>

          {/* ログ追加フォーム */}
          {addingLog && (
            <form onSubmit={handleAddLog} className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">評価</label>
                <StarSelector value={newLogRating} onChange={setNewLogRating} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">感想</label>
                <textarea
                  value={newLogText}
                  onChange={(e) => setNewLogText(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-md py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingLog(false); setNewLogText(''); setNewLogRating(null); }}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}

          {/* ログ一覧 */}
          {movie.logs.length === 0 && !addingLog ? (
            <p className="text-sm text-gray-400">ログがまだありません。</p>
          ) : (
            <ul className="space-y-4">
              {movie.logs.map((log) => (
                <li key={log.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  {editingLogId === log.id ? (
                    <form onSubmit={(e) => handleEditLog(e, log.id)} className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">評価</label>
                        <StarSelector value={editLogRating} onChange={setEditLogRating} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">感想</label>
                        <textarea
                          value={editLogText}
                          onChange={(e) => setEditLogText(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 bg-blue-600 text-white rounded-md py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLogId(null)}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <StarDisplay rating={log.rating} />
                        <div className="flex gap-3">
                          <button
                            onClick={() => startEditLog(log)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.text}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return <AuthGuard><MovieDetailPage /></AuthGuard>;
}
