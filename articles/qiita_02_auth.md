---
title: "DjangoアプリをNext.js + DRF + JWT + AWSに移行してみた #2 JWT認証フロー実装編"
tags:
  - Django
  - Next.js
  - JWT
  - DRF
  - AWS
private: false
updated_at: ''
iid: qiita_02_auth
organization_url_name: null
slide: false
ignorePublish: false
---

# DjangoアプリをNext.js + DRF + JWT + AWSに移行してみた #2 JWT認証フロー実装編

## はじめに

[前回の記事](#)では、DjangoテンプレートベースのアプリをNext.js + DRFのモノレポ構成に移行し、Docker Composeで動かせるところまで実装した。

今回は**JWT認証フロー**をフロントエンドまで通しで実装する。

- バックエンド：`djangorestframework-simplejwt`でトークン発行
- フロントエンド：ログインページ・AuthGuard・`fetchWithAuth`

完成後の動作はこうなる。

1. 未ログイン状態で `/` にアクセス → `/login` にリダイレクト
2. ユーザー名・パスワードを入力 → JWTトークンを取得・保存
3. 映画一覧を認証付きで取得して表示
4. ログアウトボタンでトークンを削除 → `/login` に戻る

---

## JWTの仕組みをおさらい

```
[ブラウザ]                          [Django]
  |                                    |
  |-- POST /api/token/ -------------->|
  |   { username, password }          |
  |                                    |
  |<-- { access, refresh } -----------|
  |                                    |
  |-- GET /api/movies/ -------------->|
  |   Authorization: Bearer <access>  |
  |                                    |
  |<-- [{ id, title, ... }] ----------|
```

- **アクセストークン**：有効期限60分。APIリクエストに毎回付与する。
- **リフレッシュトークン**：有効期限7日。アクセストークン失効後に新しいトークンを取得するために使う。

今回はアクセストークンのみ使い、リフレッシュはスコープ外とした（次回以降で実装）。

---

## バックエンド（確認）

前回の実装で `djangorestframework-simplejwt` は設定済みなので、バックエンドの追加作業はない。

`backend/config/urls.py` にトークンエンドポイントが登録されていることを確認する。

```python
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('myapp.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

`backend/config/settings.py` のDRF設定で、全エンドポイントに認証を要求している。

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

---

## フロントエンド実装

### 1. login / logout を api.ts に追加

`frontend/src/lib/api.ts` に `login()` と `logout()` を追加する。

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
```

**ポイント：トークンの保存場所**

今回はlocalStorageを選んだ。よく比較されるCookieとの違いはこちら。

| 観点 | localStorage | Cookie（httpOnly） |
|---|---|---|
| XSS耐性 | △（JSから読める） | ◎（JSから読めない） |
| CSRF耐性 | ◎（自動送信されない） | △（SameSite設定が必要） |
| Next.jsミドルウェアから読める | ✗ | ◎ |
| 実装の手軽さ | ◎ | △ |

セキュリティ要件が高い場合はhttpOnly Cookieが推奨だが、今回は学習目的かつローカル環境のため、実装がシンプルなlocalStorageを採用した。

### 2. AuthGuard コンポーネント

`frontend/src/components/AuthGuard.tsx` を新規作成する。localStorageにトークンがなければ `/login` にリダイレクトする。

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
```

`useEffect` 内でチェックしているのは、localStorageがブラウザ専用のAPIでサーバーサイドでは存在しないため。`checked` が `false` の間は `null` を返してレンダリングを止めておく。

### 3. ログインページ

`frontend/src/app/login/page.tsx` を新規作成する。

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/');
    } catch {
      setError('ユーザー名またはパスワードが間違っています');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">ログイン</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  );
}
```

### 4. 映画一覧ページをクライアントコンポーネントに変更

前回はサーバーコンポーネントで `fetch` していたが、localStorageにアクセスするためクライアントコンポーネントに変更する。AuthGuardでラップして認証を保護する。

```typescript
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
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ログアウト
          </button>
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
```

---

## 動作確認

### 管理ユーザーの作成

```bash
docker-compose exec backend python manage.py createsuperuser
```

### 起動

```bash
docker-compose up --build
```

### 確認手順

1. http://localhost:3000 にアクセス → `/login` にリダイレクトされる
2. `createsuperuser` で作成したユーザー名・パスワードでログイン
3. 映画一覧が表示される（データがなければ「映画の記録がまだありません。」）
4. ログアウトボタンで `/login` に戻る

---

## まとめ

| 実装内容 | ファイル |
|---|---|
| トークン取得・保存 | `src/lib/api.ts` |
| 未認証リダイレクト | `src/components/AuthGuard.tsx` |
| ログインフォーム | `src/app/login/page.tsx` |
| 認証付きデータ取得 | `src/app/page.tsx` |

Next.jsとDjangoを分離した構成でJWT認証を通しで実装できた。

**今後の課題：**
- アクセストークン失効時のリフレッシュ処理
- トークンのhttpOnly Cookie化（セキュリティ強化）
- 映画の追加・編集・削除機能の実装

次回はTerraformを使ったAWSインフラのコード化を予定。
