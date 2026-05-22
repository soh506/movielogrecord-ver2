---
title: "DjangoアプリをNext.js + DRF + JWT + AWSに移行してみた #1 フロントエンド環境構築編"
tags:
  - Django
  - Next.js
  - DRF
  - JWT
  - AWS
private: false
updated_at: ''
iid: qiita_01_frontend_setup
organization_url_name: null
slide: false
ignorePublish: false
---

# DjangoアプリをNext.js + DRF + JWT + AWSに移行してみた #1 フロントエンド環境構築編

## はじめに

Djangoの学習目的で作った映画視聴記録アプリがある。当初はDjangoテンプレートで画面を作っていたが、「エンジニアとしての実力を上げる」という目的でモダンな構成に移行することにした。

移行前後の構成はこちら。

**移行前**
```
Django + Djangoテンプレート + SQLite
```

**移行後**
```
Next.js（フロントエンド） + Django REST Framework（API）+ PostgreSQL + JWT認証
```

さらに最終的にはAWS（ECS Fargate + RDS + Amplify）にTerraformでデプロイする予定。この記事はその第1回で、フロントエンド環境の構築までを扱う。

---

## 移行前の構成

もともとのアプリはこんな感じ。

```
movielogrecord-ver2/
├── config/
│   ├── settings.py
│   └── urls.py
├── myapp/
│   ├── models.py
│   ├── views.py      ← Djangoテンプレートを返す関数ベースビュー
│   ├── urls.py
│   └── form.py
├── templates/
│   └── myapp/        ← HTMLテンプレート
└── manage.py
```

モデルは `Director`・`Movie`・`Log` の3つ。映画のタイトル・監督・視聴日・感想を記録できる。

```python
class Director(models.Model):
    name = models.CharField(max_length=100)

class Movie(models.Model):
    title = models.CharField(max_length=100)
    watch_date = models.DateField()
    director = models.ForeignKey(Director, on_delete=models.CASCADE)

class Log(models.Model):
    text = models.TextField()
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='log')
```

---

## 技術選定

### なぜNext.js？

フロントエンドの選択肢として Vue.js / React / Next.js を検討した。

**Next.jsにした理由：**
- フロントエンドエンジニアの求人の大半がReactベース。学習コストに対するリターンが最大。
- 素のReactだとルーティングやSSRを自前で整備する必要があるが、Next.jsはそれを解決済み。「Reactを実務レベルで使う」＝ほぼNext.js。
- TypeScriptのサポートが充実している。

### なぜJWT？

認証方式はセッション認証とJWTを比較した。

| 観点 | セッション認証 | JWT認証 |
|---|---|---|
| 仕組み | サーバー側DBにセッション保存 | トークンの署名検証のみ（DBアクセス不要） |
| Next.js + Django分離構成との相性 | △（CORS問題） | ◎ |
| ログアウトの確実性 | ◎ | △ |
| 実務での採用頻度（SPA構成） | △ | ◎ |

Next.js（ポート3000）とDjango（ポート8000）を別ポートで動かす構成のため、CookieベースのセッションはCORS問題が生じる。JWTはSPAの標準的なパターンで、実務での採用率も高い。

ログアウトの確実性はJWTの弱点だが、リフレッシュトークンを無効化する仕組みで対処できる（次回の認証実装編で扱う）。

### なぜモノレポ？

フロントとバックを同じリポジトリで管理するモノレポにした。

別リポジトリに分けるべきケース：
- チームが完全に分かれている
- デプロイ頻度がサービスごとに大きく異なる
- セキュリティ要件で権限分離が必要

今回は開発者が1人・リリースサイクルが同じ・コードの関連性が密接なので、モノレポが管理しやすい。フロントの型定義とバックのシリアライザーを同時に変更するような作業が1コミットで完結するメリットもある。

---

## 実装

### 1. ディレクトリ構成を整える

既存のDjangoコードを `backend/` に移動し、フロントエンドを `frontend/` に置くモノレポ構成にする。

```bash
mkdir backend
git mv config backend/
git mv myapp backend/
git mv templates backend/
git mv manage.py backend/
```

`git mv` を使うことでファイルの移動履歴がGitに残る。

最終的な構成：

```
movielogrecord-ver2/
├── backend/
│   ├── config/
│   ├── myapp/
│   ├── templates/
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         ← Next.js（後述）
├── infra/            ← Terraform（後回し）
└── docker-compose.yml
```

### 2. DRFのインストールと設定

`backend/requirements.txt` を作成する。

```
Django==3.2.25
djangorestframework==3.14.0
djangorestframework-simplejwt==5.2.2
django-cors-headers==4.3.1
psycopg2-binary==2.9.9
```

`backend/config/settings.py` にDRF・CORS・JWTの設定を追加する。
環境変数でSQLite（単体起動）とPostgreSQL（Docker Compose）を切り替えられるようにした。

```python
import os
from datetime import timedelta

# 環境変数があればPostgreSQL、なければSQLite
if os.environ.get('DB_HOST'):
    DATABASES = {
        'default': {
            'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.postgresql'),
            'NAME': os.environ.get('DB_NAME', 'movielogrecord'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
            'HOST': os.environ.get('DB_HOST', 'db'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {'options': '-c timezone=UTC'},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
        }
    }

INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 一番上に追加
    ...
]

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

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000'
).split(',')
```

### 3. Serializer の作成

`backend/myapp/serializers.py` を新規作成する。
`MovieSerializer` では監督名とログを入れ子で返すようにした。

```python
from rest_framework import serializers
from .models import Movie, Director, Log


class DirectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Director
        fields = ['id', 'name']


class LogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log
        fields = ['id', 'text', 'movie']


class MovieSerializer(serializers.ModelSerializer):
    director_name = serializers.CharField(source='director.name', read_only=True)
    logs = LogSerializer(source='log', many=True, read_only=True)

    class Meta:
        model = Movie
        fields = ['id', 'title', 'watch_date', 'director', 'director_name', 'logs']
```

### 4. ViewSet の追加

`backend/myapp/views.py` にDRFのViewSetを追加する。
既存のDjangoテンプレートビューはそのまま残した（`legacy/` パスに移動）。

```python
from rest_framework import viewsets
from myapp.serializers import MovieSerializer, DirectorSerializer, LogSerializer

class DirectorViewSet(viewsets.ModelViewSet):
    queryset = Director.objects.all()
    serializer_class = DirectorSerializer

class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().select_related('director').prefetch_related('log')
    serializer_class = MovieSerializer

class LogViewSet(viewsets.ModelViewSet):
    queryset = Log.objects.all()
    serializer_class = LogSerializer
```

`ModelViewSet` を使うと一覧・詳細・作成・更新・削除のエンドポイントが自動で生成される。

### 5. URLの設定

`backend/myapp/urls.py` を `DefaultRouter` ベースに書き換える。

```python
from rest_framework.routers import DefaultRouter
from myapp import views

router = DefaultRouter()
router.register(r'movies', views.MovieViewSet)
router.register(r'directors', views.DirectorViewSet)
router.register(r'logs', views.LogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # 旧テンプレートビューはlegacy/以下に移動
    path('legacy/', views.index, name='index'),
    ...
]
```

`backend/config/urls.py` にJWTエンドポイントを追加する。

```python
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('myapp.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

これで以下のエンドポイントが使えるようになる。

| メソッド | URL | 内容 |
|---|---|---|
| GET / POST | `/api/movies/` | 映画一覧・作成 |
| GET / PUT / DELETE | `/api/movies/{id}/` | 映画詳細・更新・削除 |
| GET / POST | `/api/directors/` | 監督一覧・作成 |
| GET / POST | `/api/logs/` | ログ一覧・作成 |
| POST | `/api/token/` | JWTトークン取得 |
| POST | `/api/token/refresh/` | トークン更新 |

### 6. Next.jsのセットアップ

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

型定義を `frontend/src/types/index.ts` に用意する。

```typescript
export type Director = {
  id: number;
  name: string;
};

export type Log = {
  id: number;
  text: string;
  movie: number;
};

export type Movie = {
  id: number;
  title: string;
  watch_date: string;
  director: number;
  director_name: string;
  logs: Log[];
};
```

API呼び出しの共通関数 `frontend/src/lib/api.ts` を作成する。
JWTトークンを `localStorage` から取り出して `Authorization` ヘッダーに付与する。

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token')
    : null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

映画一覧ページ `frontend/src/app/page.tsx` をServer Componentで実装する。

```tsx
import Link from 'next/link';
import { Movie } from '@/types';

async function getMovies(): Promise<Movie[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  const res = await fetch(`${apiUrl}/movies/`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? data;
}

export default async function Home() {
  const movies = await getMovies();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">映画視聴記録</h1>
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
```

### 7. Docker Compose の設定

`docker-compose.yml` でPostgreSQL・Django・Next.jsをまとめて起動できるようにする。

```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: movielogrecord
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DB_HOST: db
      DB_NAME: movielogrecord
      DB_USER: postgres
      DB_PASSWORD: postgres
      DEBUG: "True"
      CORS_ALLOWED_ORIGINS: "http://localhost:3000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api
      API_URL: http://backend:8000/api
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 動作確認

```bash
# Docker Composeで全部まとめて起動
docker-compose up

# バックエンドのみ（SQLite）
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# フロントエンドのみ
cd frontend
npm install
npm run dev
```

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:8000/api/ |
| Django管理画面 | http://localhost:8000/admin/ |

---

## まとめ

今回やったこと：

- DjangoコードをDRFベースのAPIサーバーに変更
- `ModelViewSet` + `DefaultRouter` でCRUDエンドポイントを自動生成
- Next.js（TypeScript + Tailwind + App Router）をセットアップ
- Django・Next.js・PostgreSQLをDocker Composeで繋いだ

技術選定の段階で「なぜその技術を選ぶか」を言語化しておくと、後から見返したときに自分の判断の根拠が残るのでおすすめ。

## 次回

次回はissue #3のログイン機能を実装する。
JWT認証のフローをDjango側（simplejwt）からNext.js側（ログイン画面・トークン管理）まで通しで実装する予定。

- [ ] ログイン・ログアウトのUI
- [ ] JWTトークンの取得・保存・リフレッシュ
- [ ] 未認証ユーザーのリダイレクト

---

リポジトリ：https://github.com/soh506/movielogrecord-ver2
