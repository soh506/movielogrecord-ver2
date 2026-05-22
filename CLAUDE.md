# movielogrecord-ver2 プロジェクト概要

Djangoの学習目的で作った映画視聴記録アプリ。
現在、エンジニアスキル向上を目的にモダンな構成へ移行中。

## プロジェクトの目的

- エンジニアとしての実力を上げるための個人プロジェクト
- Next.js・DRF・JWT・AWS・Terraformを実際に組み合わせて使う経験を積む

## 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| フロントエンド | Next.js（TypeScript + Tailwind CSS、App Router） | 求人市場でのデファクトスタンダード。Reactの現実解。 |
| バックエンド | Django 3.0.2 + Django REST Framework | 既存コードを流用。APIサーバーとして使う。 |
| 認証 | JWT（djangorestframework-simplejwt） | SPA + 別ドメイン構成との相性。実務パターンの習得。 |
| DB（ローカル） | SQLite | 単体起動時のシンプルさ。 |
| DB（Docker/本番） | PostgreSQL（RDS） | 本番標準。SQLiteは本番不可。 |
| IaC | Terraform | CloudFormationよりマルチクラウド対応・求人価値が高い。 |
| デプロイ | AWS（Amplify + ECS Fargate + RDS + ALB） | SAA取得済みの知識を活かす。 |
| コンテナ | Docker / Docker Compose | ローカル→AWSへの移行をそのままできるようにする。 |

## リポジトリ構成（モノレポ）

```
movielogrecord-ver2/
├── backend/              ← Django REST Framework
│   ├── config/           ← settings.py, urls.py
│   ├── myapp/            ← models, views(DRF ViewSets), serializers
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             ← Next.js（TypeScript + Tailwind）
│   ├── src/
│   │   ├── app/          ← App Router ページ
│   │   ├── types/        ← 型定義（Movie, Director, Log）
│   │   └── lib/          ← API クライアント（fetchWithAuth）
│   └── Dockerfile
├── infra/                ← Terraform（未着手）
├── docker-compose.yml    ← PostgreSQL + Django + Next.js
└── .gitignore
```

## API エンドポイント

| メソッド | URL | 内容 |
|---|---|---|
| GET/POST | `/api/movies/` | 映画一覧・作成 |
| GET/PUT/DELETE | `/api/movies/{id}/` | 映画詳細・更新・削除 |
| GET/POST | `/api/directors/` | 監督一覧・作成 |
| GET/POST | `/api/logs/` | ログ一覧・作成 |
| POST | `/api/token/` | JWTトークン取得 |
| POST | `/api/token/refresh/` | トークン更新 |

## 認証方式の決定理由

セッション認証とJWTを比較した上でJWTを選択。
- Next.js（ポート3000）とDjango（ポート8000）を別ドメインで動かすため、CookieベースのセッションはCORS問題が生じる
- JWTはサーバーレスでトークン検証できる（DBアクセス不要）
- 実務のSPA構成では標準的なパターン

## ローカル起動方法

### バックエンドのみ（SQLite）

仮想環境は Python 3.12 で作成すること（3.13以降は Django 3.2 と非互換）。

**初回セットアップ（仮想環境の作成）：**

```bash
cd backend
/opt/homebrew/bin/python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install setuptools  # pkg_resources が必要なパッケージ対策
```

**2回目以降：**

```bash
cd backend
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

### フロントエンドのみ

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose（全部まとめて）

```bash
docker-compose up
```

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000/api/
- Django管理画面: http://localhost:8000/admin/

## GitHub Issues

| # | タイトル | 状態 |
|---|---|---|
| #1 | docs: README.mdを作成する | コミット済み・実質完了 |
| #2 | frontend: フロントエンド環境を作成する | `feature/frontend-setup` で実装済み・PR未 |
| #3 | auth: ログイン機能を追加する | 未着手 |

## コミット規則

グローバル設定に従い Conventional Commits 形式。

```
feat(frontend): 映画一覧ページを追加
fix(backend): ログ削除時のリダイレクト先を修正
```

## ブランチ戦略

- `master` への直接pushは禁止
- 機能ごとにブランチを切ってPRを出す
- ブランチ名: `feature/<内容>` / `fix/<内容>`

## 環境変数

### backend/.env（.env.example を参照）

```
SECRET_KEY=...
DEBUG=True
DB_HOST=db        # 設定するとPostgreSQLに切り替わる。未設定時はSQLite。
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### frontend/.env.local（.env.local.example を参照）

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 今後の予定

1. `feature/frontend-setup` のPRを作成・マージ
2. issue #3（ログイン機能）: JWT認証フローをフロントエンドまで実装
3. `infra/` にTerraformでAWSインフラをコード化
4. CI/CD（GitHub Actions）を整備してAWSにデプロイ
