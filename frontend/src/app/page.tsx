'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie } from '@/types';
import { fetchWithAuth, logout } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';


function MovieList() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetchWithAuth('/movies/')
      .then((data) => setMovies(data.results ?? data))
      .catch(() => setMovies([]));
  }, []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">映画視聴記録</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/movies/new"
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ＋ 映画を追加
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm border border-gray-300 text-gray-600 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>

        {movies.length === 0 ? (
          <p className="text-gray-500">映画の記録がまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {movies.map((movie) => (
              <li key={movie.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <Link href={`/movies/${movie.id}`} className="block hover:opacity-75 transition-opacity">
                  <p className="text-lg font-semibold text-gray-900">{movie.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {movie.director_name} ・ {movie.watch_date}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <MovieList />
    </AuthGuard>
  );
}
