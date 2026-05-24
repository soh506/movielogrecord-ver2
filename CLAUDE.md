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
| バックエンド | Django 3.2.25 + Django REST Framework | 既存コードを流用。APIサーバーとして使う。 |
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
│   ├── myapp/            ← models, views(DRF ViewSets), serializers, migrations
│   ├── requirements.txt
│   ├── .venv/            ← Python 3.12 仮想環境（.gitignore済み）
│   └── Dockerfile
├── frontend/             ← Next.js（TypeScript + Tailwind）
│   ├── src/
│   │   ├── app/          ← App Router ページ
│   │   │   ├── page.tsx          ← 映画一覧
│   │   │   ├── login/            ← ログイン
│   │   │   ├── movies/new/       ← 映画追加
│   │   │   ├── movies/[id]/      ← 映画詳細・ログ管理
│   │   │   ├── movies/[id]/edit/ ← 映画編集
│   │   │   └── directors/new/    ← 監督追加
│   │   ├── components/   ← AuthGuard
│   │   ├── types/        ← 型定義（Movie, Director, Log）
│   │   └── lib/          ← API クライアント（fetchWithAuth, login, logout）
│   └── Dockerfile
├── articles/             ← Qiita記事（3本作成済み）
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
| #1 | docs: README.mdを作成する | 完了 |
| #2 | frontend: フロントエンド環境を作成する | 完了・マージ済み |
| #3 | auth: ログイン機能を追加する | 完了・マージ済み |
| #6 | backend: Logモデルに星評価フィールドを追加 | 完了・マージ済み |
| #7 | frontend: 映画の追加・編集・削除を実装 | 完了・マージ済み |
| #8 | frontend: 監督の追加機能を実装 | 完了・マージ済み |
| #9 | frontend: 視聴ログの追加・星評価機能を実装 | 完了・マージ済み |

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

## 記事管理フロー

技術記事は Qiita と Zenn の両方に投稿する。

| 役割 | 場所 |
|---|---|
| 初稿・下書き | `movielogrecord-ver2/articles/`（ここで書き始める） |
| Qiita編集・投稿 | `~/Documents/qiita-contents/public/` |
| Zenn編集・投稿 | `~/Documents/zenn-contents/articles/` |

**手順：**
1. `articles/` に元原稿を書く
2. Qiita用・Zenn用にそれぞれコピーしてフロントマターを調整
3. コピー後は各プラットフォームのディレクトリを直接編集する（元原稿との同期は不要）

**投稿コマンド：**
```bash
# Qiita
cd ~/Documents/qiita-contents
npx qiita publish <ファイルのベース名>

# Zenn（プレビュー）
cd ~/Documents/zenn-contents
npx zenn preview
```

**注意：** Qiita に投稿すると `id` フィールドが UUID に自動更新される。元原稿にコピーし直すと上書きされるので注意。

---

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

## 現在の進捗

Terraform による AWS インフラ構築・ECS デプロイまで完了。次は Amplify フロントエンドの SSR 問題を解消してフルスタックで動かす。

### 残タスク（優先順）

1. ~~**アクセストークンのリフレッシュ処理**~~ — 完了
2. ~~**トークンの httpOnly Cookie 化**~~ — 完了（Django Cookie ビュー + Next.js API Route プロキシ）
3. ~~**エラー・ローディング表示の整備**~~ — 完了
4. ~~**Terraform で AWS インフラをコード化**~~ — 完了（`infra/` にフラット構成で作成）
5. **Amplify フロントエンドを AWS 上で動かす** — 要対応（下記参照）
6. **CI/CD（GitHub Actions）** → AWS へ自動デプロイ

### Amplify SSR 問題と対応方針

**問題：** Next.js がプロキシ API Route（`/app/api/[...proxy]`）を使っているため SSR が必要。
Amplify Gen 1 の `WEB_COMPUTE` は Next.js モノレポと相性が悪く `deploy-manifest.json` エラーが出る。

**対応方針（どちらかを選ぶ）：**

**A. 静的エクスポートに切り替える（簡単・30分）**
- `lib/api.ts` の `API_BASE` を `NEXT_PUBLIC_API_URL` に変更（ALB を直接呼ぶ）
- JWT を localStorage に戻す（Cookie 認証を廃止）
- `next.config.ts` に `output: 'export'` を追加
- Amplify の platform を `WEB`、baseDirectory を `frontend/out` に変更
- Django の CORS に Amplify ドメインを追加

**B. Amplify SSR アダプターを導入する（本格的・1時間）**
- `@aws-amplify/adapter-nextjs` をインストール
- Next.js を Amplify SSR 対応に設定
- httpOnly Cookie 認証はそのまま維持できる

**動作確認済み（terraform apply + destroy 済み）：**
- ECS Fargate で Django API が起動（ALB 経由で 401 返却を確認）
- RDS PostgreSQL へのマイグレーション成功
- ECR へのイメージ push 成功
- Amplify ビルドは成功（SSR の配信だけが未解決）

**次回の手順：**
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # db_password / django_secret_key / github_token を入力
terraform init
terraform apply -auto-approve
```

### Qiita 記事の進捗

| # | タイトル | 状態 |
|---|---|---|
| #1 | フロントエンド環境構築編 | 作成済み（articles/qiita_01_frontend_setup.md） |
| #2 | JWT認証フロー実装編 | 作成済み（articles/qiita_02_auth.md） |
| #3 | CRUD実装編 | 作成済み（articles/qiita_03_crud.md） |
| #4 | セキュリティ強化編（httpOnly Cookie）| 作成済み（articles/qiita_04_auth_security.md） |
| #5 | Terraform・AWSデプロイ編 | 作成済み（articles/qiita_05_terraform_aws.md） |
