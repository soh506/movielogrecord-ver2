---
title: "DjangoアプリをNext.js + DRF + JWT + AWSに移行してみた #3 CRUD実装編"
tags:
  - Django
  - Next.js
  - DRF
  - JWT
  - AWS
private: false
updated_at: ''
iid: qiita_03_crud
organization_url_name: null
slide: false
ignorePublish: false
---

# DjangoアプリをNext.js + DRF + JWT + AWSに移行してみた #3 CRUD実装編

## はじめに

[前回の記事](#)では JWT 認証フローをフロントエンドまで通しで実装した。ログイン・ログアウトはできるようになったが、映画の追加・編集・削除はまだできない読み取り専用のアプリだった。

今回はフロントエンドの CRUD 機能を一通り実装する。

**今回実装した機能：**
- 視聴ログの星評価フィールド追加（バックエンド）
- 映画の追加・編集・削除
- 監督の追加
- 視聴ログの追加・編集・削除・星評価
- ログの記録日時・記録者名の表示

---

## バックエンド：Logモデルの拡張

### 星評価フィールドの追加

`Log` モデルに `rating`（星評価）・`created_at`（記録日時）・`user`（記録者）を追加する。

```python
# backend/myapp/models.py
from django.conf import settings
from django.db import models

class Log(models.Model):
    RATING_CHOICES = [(i, i) for i in range(1, 6)]

    text = models.TextField()
    rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='log')
```

- `rating` : null=星なし、1〜5=星の数
- `created_at` : 保存時に自動記録
- `user` : ログ作成時に自動セット。ユーザー削除時は NULL になる（`SET_NULL`）

マイグレーションは3回に分けて作成した（`rating` → `created_at` → `user` の順）。

### シリアライザーの更新

```python
# backend/myapp/serializers.py
class LogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Log
        fields = ['id', 'text', 'rating', 'created_at', 'username', 'movie']
        read_only_fields = ['created_at', 'username']
```

`username` は `user.username` を読み取り専用で返す。フロントエンドにユーザーIDではなく名前を渡すためにこうしている。

### ViewSetでログ作成時にユーザーを自動セット

```python
# backend/myapp/views.py
class LogViewSet(viewsets.ModelViewSet):
    queryset = Log.objects.all()
    serializer_class = LogSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```

`perform_create` をオーバーライドして、ログ保存時にリクエストユーザーを自動的にセットする。

---

## フロントエンド実装

### 型定義の更新

```typescript
// frontend/src/types/index.ts
export type Log = {
  id: number;
  text: string;
  rating: number | null;
  created_at: string;
  username: string | null;
  movie: number;
};
```

### 映画追加フォーム（タイトル・監督・視聴日・星評価・感想を一括入力）

映画を追加する際に視聴ログ（星評価・感想）も同時に入力できるようにした。

```typescript
// frontend/src/app/movies/new/page.tsx（抜粋）
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
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
```

映画を先に作成し、感想が入力されていればログも続けて作成する。ログは任意入力。

**監督追加後のフォーム状態保持**

「＋ 監督を追加」をクリックすると別ページに遷移するため、入力済みのタイトルや視聴日が消えてしまう問題があった。`sessionStorage` にフォームの状態を保存して対応した。

```typescript
function handleAddDirector() {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, directorId, watchDate, logText, logRating }));
  router.push('/directors/new?returnTo=/movies/new');
}

useEffect(() => {
  const draft = sessionStorage.getItem(DRAFT_KEY);
  if (draft) {
    const saved = JSON.parse(draft);
    setTitle(saved.title ?? '');
    // ... 他のフィールドも復元
    sessionStorage.removeItem(DRAFT_KEY);
  }
}, []);
```

### 星評価UIコンポーネント

```typescript
function StarSelector({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`text-xs px-2 py-0.5 rounded border ${
          value === null ? 'bg-gray-200 border-gray-400' : 'border-gray-300 text-gray-400'
        }`}
      >
        なし
      </button>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-xl ${star <= (value ?? 0) ? 'text-yellow-400' : 'text-gray-300'}`}
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
```

### 映画詳細ページ（ログの追加・編集・削除）

映画詳細ページでログを管理する。追加・編集フォームはインラインで表示する。

```typescript
// ログ追加
async function handleAddLog(e: React.FormEvent) {
  e.preventDefault();
  await fetchWithAuth('/logs/', {
    method: 'POST',
    body: JSON.stringify({ text: newLogText, rating: newLogRating, movie: Number(params.id) }),
  });
  loadMovie(); // 映画データを再取得してログ一覧を更新
}

// ログ削除
async function handleDeleteLog(logId: number) {
  await fetchWithAuth(`/logs/${logId}/`, { method: 'DELETE' });
  loadMovie();
}
```

ログを追加・編集・削除するたびに `loadMovie()` を呼んで映画データを再取得することで、ログ一覧を最新状態に保つ。

ログ一覧には記録日・ユーザー名・星評価を表示する。

```typescript
<div className="flex items-center gap-3">
  <StarDisplay rating={log.rating} />
  <span className="text-xs text-gray-400">
    {new Date(log.created_at).toLocaleDateString('ja-JP')}
    {log.username && `　${log.username}`}
  </span>
</div>
```

### 監督追加ページ

監督追加は `returnTo` クエリパラメータで呼び出し元に戻れるようにした。

```typescript
// /directors/new?returnTo=/movies/new
const returnTo = searchParams.get('returnTo') ?? '/';

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  await fetchWithAuth('/directors/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  router.push(returnTo);
}
```

---

## つまずいたポイント

### 1. 監督追加後にフォームの入力内容が消える

**症状：** 映画追加フォームでタイトルや視聴日を入力した後、「＋ 監督を追加」をクリックして監督追加ページに遷移し戻ってくると、入力内容がすべて消えていた。

**原因：** Next.js でページ間を遷移すると React のコンポーネントが再マウントされ、`useState` の状態がリセットされる。

**解決策：** 別ページに遷移する前に `sessionStorage` にフォームの状態を保存し、戻ってきたタイミングで復元する。

```typescript
// 遷移前に保存
function handleAddDirector() {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, directorId, watchDate, logText, logRating }));
  router.push('/directors/new?returnTo=/movies/new');
}

// マウント時に復元
useEffect(() => {
  const draft = sessionStorage.getItem(DRAFT_KEY);
  if (draft) {
    const saved = JSON.parse(draft);
    setTitle(saved.title ?? '');
    setDirectorId(saved.directorId ?? '');
    setWatchDate(saved.watchDate ?? '');
    sessionStorage.removeItem(DRAFT_KEY);
  }
}, []);
```

`localStorage` と違い `sessionStorage` はタブを閉じると消えるので、フォームの一時保存用途にちょうどよい。

---

### 2. DELETE リクエストで `fetchWithAuth` がエラーになる

**症状：** 映画削除（`DELETE /api/movies/{id}/`）を実行すると、DRF は `204 No Content` を返すが、`fetchWithAuth` の中で `res.json()` を呼んでいるためエラーになった。

**原因：** HTTP 204 はボディが空なので `JSON.parse` に失敗する。

**解決策：** ステータスコードが 204 の場合は `res.json()` をスキップして `null` を返すようにした。

```typescript
export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  // ...
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;  // ← 追加
  return res.json();
}
```

---

### 3. ローカルでマイグレーションが実行できない

**症状：** モデルを変更してマイグレーションを生成しようとしたが、`python manage.py makemigrations` が `ModuleNotFoundError: No module named 'django'` で失敗した。

**原因その1：** 仮想環境を作成していなかった。

**原因その2：** `brew install python` でインストールされた Python のバージョンが 3.14 で、Django 3.2 が依存している `cgi` モジュールが Python 3.13 以降で削除されていた。

**解決策：** Python 3.12 をインストールして仮想環境を作り直した。

```bash
brew install python@3.12
/opt/homebrew/bin/python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

Python のバージョンと使用するフレームワークの対応関係は事前に確認しておく必要があった。Docker コンテナは `python:3.11-slim` を使っているので問題なかったが、ローカル環境はデフォルトで最新 Python が入るため注意が必要。

---

## ページ構成まとめ

| URL | 内容 |
|---|---|
| `/` | 映画一覧 |
| `/movies/new` | 映画追加（ログ同時入力可） |
| `/movies/[id]` | 映画詳細・ログ管理 |
| `/movies/[id]/edit` | 映画編集 |
| `/directors/new` | 監督追加 |
| `/login` | ログイン |

---

## 動作確認

```bash
docker-compose up --build
```

1. http://localhost:3000/login でログイン
2. 「＋ 映画を追加」からタイトル・監督・視聴日・星評価・感想を入力して保存
3. 映画一覧に追加された映画が表示される
4. 映画をクリックして詳細ページでログの追加・編集・削除を確認

---

## まとめ

| 実装内容 | ファイル |
|---|---|
| 星評価・記録日時・ユーザー | `backend/myapp/models.py` |
| ログ作成時のユーザー自動セット | `backend/myapp/views.py` |
| 映画追加（ログ同時入力） | `frontend/src/app/movies/new/page.tsx` |
| 映画詳細・ログ管理 | `frontend/src/app/movies/[id]/page.tsx` |
| 映画編集 | `frontend/src/app/movies/[id]/edit/page.tsx` |
| 監督追加 | `frontend/src/app/directors/new/page.tsx` |

フロントエンドの CRUD 機能がひと通り揃った。

**今後の課題：**
- アクセストークン失効時のリフレッシュ処理
- エラー・ローディング表示の整備
- Terraformを使ったAWSインフラのコード化
- AWS（ECS Fargate + RDS + Amplify）へのデプロイ

次回はTerraformとAWSデプロイを予定。
