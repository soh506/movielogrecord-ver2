'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Director } from '@/types';
import { fetchWithAuth, ApiError } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';

function DirectorListPage() {
  const router = useRouter();
  const [directors, setDirectors] = useState<Director[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchWithAuth('/directors/')
      .then((data) => { setDirectors(data.results ?? data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    setDeletingId(id);
    setDeleteError('');
    try {
      await fetchWithAuth(`/directors/${id}/`, { method: 'DELETE' });
      setDirectors((prev) => prev.filter((d) => d.id !== id));
      setConfirmId(null);
    } catch (e) {
      setDeleteError(
        e instanceof ApiError && e.status === 400
          ? '映画が登録されているため削除できません。先に映画を削除してください。'
          : '削除に失敗しました'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">監督管理</h1>
          <div className="flex gap-3">
            <Link
              href="/directors/new"
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ＋ 監督を追加
            </Link>
            <button
              onClick={() => router.push('/')}
              className="text-sm border border-gray-300 text-gray-600 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              ← 一覧に戻る
            </button>
          </div>
        </div>

        {deleteError && (
          <p className="text-sm text-red-600 mb-4">{deleteError}</p>
        )}

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="text-sm text-red-600">監督一覧の取得に失敗しました。</p>
        ) : directors.length === 0 ? (
          <p className="text-gray-500">監督が登録されていません。</p>
        ) : (
          <ul className="space-y-2">
            {directors.map((d) => (
              <li key={d.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                {confirmId === d.id ? (
                  <div>
                    <p className="text-sm text-gray-700 mb-3">
                      <span className="font-medium">{d.name}</span> を削除しますか？
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        className="flex-1 bg-red-600 text-white rounded-md py-1.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {deletingId === d.id ? '削除中...' : '削除する'}
                      </button>
                      <button
                        onClick={() => { setConfirmId(null); setDeleteError(''); }}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-1.5 text-sm hover:bg-gray-50 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{d.name}</span>
                    <div className="flex gap-2">
                      <Link
                        href={`/directors/${d.id}/edit`}
                        className="text-xs border border-gray-300 text-gray-600 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => { setConfirmId(d.id); setDeleteError(''); }}
                        className="text-xs border border-red-300 text-red-500 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return <AuthGuard><DirectorListPage /></AuthGuard>;
}
