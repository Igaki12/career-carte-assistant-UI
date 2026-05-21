# Career Karte Assistant - VPS本番MVP実装指示書

このファイルは、Codex CLI が XServer VPS 上で Career Karte Assistant を本番MVPとして構築するための専用指示書である。アプリ仕様の正本は `AGENTS.md` とし、本ファイルは VPS / Express / PostgreSQL / Apache2 / BrowserRouter 化の実装方針を決め切る。

## 1. 目標

GitHub Pages デモ版を、以下の本番MVP構成へ移行する。

- Hosting: XServer VPS
- OS: Ubuntu 26.04 LTS
- Frontend: React + Vite + Chakra UI + Three.js + @pixiv/three-vrm
- Routing: React Router DOM + BrowserRouter
- Backend: Node.js 24.x Active LTS + Express
- Reverse Proxy / HTTPS / Static Hosting: Apache2
- DB: PostgreSQL 18.x
- DB access: `pg` + 明示的SQL。ORMは採用しない。
- Deploy / Backup: XServer VPS のイメージ保存と PostgreSQL dump を正とする手動運用
- AI APIキー管理: サーバー環境変数

本番MVPでは、ブラウザに API キーや本番データを保存しない。OpenAI / Gemini の呼び出し、認証、ロール、テナント、カルテ、下書き、会話ログ、利用回数、機能フラグはサーバー側で管理する。

## 2. 重要な前提

### 2.1 Ubuntu 26.04 LTS の扱い

本番MVPは Ubuntu 26.04 LTS で構築する。Ubuntu公式のリリース一覧では、Ubuntu 26.04 LTS は 2026年4月23日リリース、標準サポートは 2031年5月まで、Legacy support は 2041年4月までとされている。

運用ルール:

- 本ファイルのコマンドやリポジトリ指定は Ubuntu 26.04 LTS 用で固定する。
- OS のマイナー更新、セキュリティ更新、Apache2 / Node.js / PostgreSQL の更新は、XServer VPS のイメージ保存と `pg_dump` を取得してから適用する。
- 次期LTSやOS更新へ移行する場合は、OS 名、PGDG codename、依存パッケージ、systemd、Apache2 設定を見直す。

参照:

- Ubuntu releases: https://documentation.ubuntu.com/project/release-team/list-of-releases/
- Node.js release schedule: https://github.com/nodejs/Release
- PostgreSQL Ubuntu packages: https://www.postgresql.org/download/linux/ubuntu/

### 2.2 既存デモ版から置き換えるもの

VPS 本番MVPでは以下を置き換える。

- `HashRouter` を `BrowserRouter` に置き換える。
- `docs/` 配下を GitHub Pages 配信物として正にする構成をやめ、Vite の本番ビルド `dist/` を Apache2 から配信する。
- `localStorage` / `sessionStorage` を本番データの保存先にしない。
- `ApiKeyModal` とブラウザ内 API キー保存を本番導線から廃止する。
- `cca-openai-api-key`, `cca-gemini-api-key`, `cca-api-key`, `cca-demo-auth-session`, `cca-demo-user-state` を本番保存先として使わない。
- ブラウザから OpenAI / Gemini へ直接 `fetch` しない。
- `src/lib/demoAuth.ts`, `src/lib/demoAccounts.ts`, `src/lib/demoUserState.ts`, `src/lib/demoUsageQuota.ts` は本番API接続へ置き換える。
- デモの「任意パスワードでログイン」は廃止し、bcrypt で検証する。

### 2.3 維持するアプリ仕様

画面構成、ロール別導線、SHIRPカルテ仕様、初回面談/継続面談、VRM運用、音声合成方針、UIデザインは `AGENTS.md` を正とする。VPS移行中に仕様判断が必要な場合は、先に `AGENTS.md` を確認する。

## 3. 本番MVPアーキテクチャ

### 3.1 実行構成

- Apache2
  - 80番を443番へリダイレクト
  - HTTPS終端
  - Vite build の静的ファイル配信
  - `/api` を Express へ reverse proxy
  - BrowserRouter の直URLアクセスを `index.html` へ fallback
- Express
  - `127.0.0.1:3000` で待ち受ける
  - 認証、セッション、DB API、AI API proxy を担当する
  - OpenAI / Gemini APIキーは環境変数から読む
- PostgreSQL
  - 認証、テナント、プロフィール、カルテ、下書き、会話ログ、利用回数、機能フラグ、通知文を保存する
- systemd
  - Express アプリをサービスとして常駐させる
  - `Restart=always` を設定する

### 3.2 VPSディレクトリ

標準配置:

```text
/var/www/career-carte-assistant/
  app/                  # アプリ本体
  shared/
    .env                # サーバー環境変数。外部公開・共有しない
    logs/
    backups/
```

ルール:

- `.env`、DB dump、ログ、秘密鍵は Apache2 の DocumentRoot の外に置く。
- 本番配信対象は `/var/www/career-carte-assistant/app/dist` のみとする。
- VRM は本番では Vite build に含まれる `public/models` 由来の配信物を正とする。GitHub Pages 用 `docs/models` は本番配信の正にしない。

### 3.3 OS / Middleware 導入方針

Ubuntu 26.04 LTS 上で以下を標準にする。

- Node.js: 24.x Active LTS
- PostgreSQL: 18.x
- PostgreSQL apt repository: `resolute-pgdg`
- Apache2: Ubuntu 26.04 LTS 標準パッケージ

導入例:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg apache2
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt resolute-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
sudo apt update
sudo apt install -y postgresql-18 postgresql-client-18
```

実作業時は XServer VPS の初期状態に合わせ、既存の Apache2 / PostgreSQL / Node.js と競合しないことを確認する。

## 4. 環境変数

Express は以下を読む。

```bash
NODE_ENV=production
PORT=3000
APP_ORIGIN=https://example.com
COOKIE_SECURE=true
SESSION_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
DATABASE_URL=postgresql://career_carte_app:CHANGE_ME@127.0.0.1:5432/career_carte
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

ルール:

- `OPENAI_API_KEY` と `GEMINI_API_KEY` はサーバー環境変数で管理し、フロントエンドへ渡さない。
- `.env` は VPS 上のみに置き、リポジトリへ含めない。
- `SESSION_SECRET` は十分に長いランダム値を使う。
- 本番HTTPSでは `COOKIE_SECURE=true` を必須にする。
- `APP_ORIGIN` は実ドメインに置き換える。
- 独自ドメイン未確定時の例示では `example.com` を使い、実作業時に必ず置換する。

## 5. Frontend 移行方針

### 5.1 Router

`src/main.tsx` の `HashRouter` を `BrowserRouter` に置き換える。

本番URL:

- `/login`
- `/admin/login`
- `/user`
- `/user/demographics`
- `/user/condition-check`
- `/app/initial`
- `/app/continuous`
- `/company-admin`
- `/operations-admin`
- `/consultant`
- `/admin`

Apache2 で SPA fallback を設定し、上記URLを直接開いても `index.html` が返るようにする。

### 5.2 認証状態

フロントは起動時に `GET /api/auth/session` を呼び、ログイン状態を取得する。認証セッションを `localStorage` / `sessionStorage` に保存しない。

`GET /api/auth/session` の返却形:

```json
{
  "authenticated": true,
  "user": {
    "id": "USR-2026-101",
    "email": "misaki.saeki@example.com",
    "role": "user",
    "tenantId": "tenant-career-carte-demo",
    "managedTenantIds": [],
    "defaultRoute": "/user",
    "lastName": "佐伯",
    "firstName": "美咲",
    "lastNameKana": "サエキ",
    "firstNameKana": "ミサキ",
    "company": "Career Carte Inc.",
    "department": "Customer Success",
    "jobTitle": "販売/サービススタッフ職",
    "permissionLabel": "一般ユーザー"
  }
}
```

`defaultRoute`:

- `user`: `/user`
- `company-admin`: `/user`
- `operations-admin`: `/operations-admin`
- `consultant`: `/consultant`
- `admin`: `/admin`

### 5.3 APIキーUIの廃止

本番MVPでは `src/components/ApiKeyModal.tsx` をユーザーに表示しない。OpenAI / Gemini APIキーの入力欄、ブラウザ保存、`cca-openai-api-key`、`cca-gemini-api-key`、`cca-api-key` の利用は本番導線から廃止する。

### 5.4 AI fetch の置き換え

既存の `src/components/MeetingRoom.tsx` にある OpenAI / Gemini 直接呼び出しは、以下の Express API 経由へ置き換える。

- Chat Completions: `POST /api/ai/chat`
- Whisper STT: `POST /api/ai/transcriptions`
- OpenAI TTS: `POST /api/ai/tts/openai`
- Gemini TTS: `POST /api/ai/tts/gemini`

レスポンス形式:

- Chat: JSON
- Transcription: JSON `{ "text": "..." }`
- OpenAI TTS: `audio/mpeg` blob
- Gemini TTS: `audio/wav` blob を優先する。実装上 base64 JSON しか扱えない場合は Express 側で blob 化して返す。

### 5.5 localStorage 依存の置き換え

本番MVPでは以下の保存先を PostgreSQL API に移行する。

- 認証セッション
- アカウント基本情報
- プロフィール詳細
- 最新カルテ
- 保存済みカルテ
- 会話ログ
- 初回/継続面談の下書き
- テナント
- 企業別機能フラグ
- コンディション記録
- 企業管理者向け従業員カルテ一覧
- 運用管理者向け管理テナント一覧
- 面談利用回数
- AI使用回数
- 一時パスワード通知文

移行期間中にデモ互換コードが残っていてもよいが、本番フラグでは DB API を正とする。

## 6. 認証・ロール制御

### 6.1 通常ログイン

通常ログイン画面 `/login` は一般ユーザー、企業管理者、運用管理者、キャリアコンサルタント共通入口とする。システム管理者はこの入口を使わない。

`POST /api/auth/login`

Input:

```json
{
  "email": "misaki.saeki@example.com",
  "password": "password",
  "remember": true
}
```

処理:

- `email` は `users.email` と完全一致で照合する。大文字小文字の扱いはDB上で `lower(email)` unique index を作り、ログイン時は正規化して比較する。
- `role` はクライアントに指定させない。DB上の `users.role` を正とする。
- `role = admin` のユーザーは通常ログインAPIでログインさせない。
- パスワードは bcrypt hash で検証する。
- `remember = true` の場合のみ長寿命セッションにする。
- ログイン成功後はロール別 `defaultRoute` を返す。企業管理者は `/user` へ遷移する。

### 6.2 管理者ログイン

管理者ログイン画面 `/admin/login` はシステム管理者専用入口とする。

`POST /api/admin/auth/login`

Input:

```json
{
  "adminId": "admin@example.com",
  "password": "password"
}
```

処理:

- `adminId` は `users.email` または `users.id` と照合する。
- `role = admin` のユーザーのみログインを許可する。
- 管理者利用条件の同意チェックや確認モーダルは表示しない。
- 成功後は `/admin` へ遷移する。

### 6.3 セッション

実装方針:

- PostgreSQL-backed cookie session を使う。
- Cookie は `httpOnly`, `secure`, `sameSite=lax` を基本にする。
- `COOKIE_SECURE=true` の本番HTTPSを必須にする。
- CSRF対策を実装する。Cookieセッションを使うため、状態変更APIは CSRF token または same-site 前提の二重送信Cookieで保護する。
- `POST /api/auth/logout` はセッションを破棄する。
- `GET /api/auth/session` は現在のログイン状態、ロール、テナント、管理対象テナント、基本アカウント情報を返す。

### 6.4 ロール別アクセス制御

サーバー側で必ず検証する。フロント表示だけに依存しない。

- `user`: 自分の `/user`, `/user/demographics`, `/user/condition-check`, `/app/initial`, `/app/continuous`
- `company-admin`: 自分の `/user` 系画面と、自社テナントの `/company-admin`
- `operations-admin`: `operation_admin_tenants` に登録された複数テナントの `/operations-admin`
- `consultant`: 自分の `/consultant` と `consultant_assignments` の担当ユーザー
- `admin`: `/admin` と全テナント

未ログイン状態で保護ページへアクセスした場合:

- 通常ページは `/login?returnTo=...`
- 管理者ページは `/admin/login?returnTo=...`

## 7. Express API 設計

### 7.1 ユーザー・プロフィールAPI

- `GET /api/me/demographics`
- `PUT /api/me/demographics`

返却時は `users` の基本情報と `user_demographics` の詳細情報を合成して `DemographicData` 相当の形にする。

保存ルール:

- `users` を正とする項目: `accountId`, `name`, `lastName`, `firstName`, `nameKana`, `lastNameKana`, `firstNameKana`, `email`, `company`, `department`, `jobTitle`, `permission`
- `user_demographics` を正とする項目: `birthDate`, `workLocationPrefecture`, `jobChangeCount`, `yearsOfService`, `gender`, `maritalStatus`, `childrenCount`, `youngestChildAge`, `managerExperience`, `currentManager`, `demographicsSkipped`
- ユーザー本人向け画面では `姓`, `名`, `フリガナ（姓）`, `フリガナ（名）`, `メール`, `会社名` は編集不可にする。
- `birthDate` は `YYYY-MM-DD` に正規化する。
- `jobChangeCount`, `yearsOfService`, `youngestChildAge` は整数または `null` に正規化する。
- `childrenCount` が `0`, 未入力, `回答しない` の場合、`youngestChildAge` は `null` にする。

### 7.2 カルテAPI

- `GET /api/karte-records`
- `POST /api/karte-records`
- `GET /api/karte-records/latest`

保存対象:

- `meetingType`: `initial` または `continuous`
- `continuousMode`: `normal`, `turn`, または `null`
- `initialPromptVariant`: 初回面談では `front_light` を通常導線の正とする
- `statusLabel`
- `shirp`
- `shirpDetails`
- `survey`
- `conditionSummary`
- `feedback`
- `conversationLog`

重要:

- `KarteData` 返却時は、アカウント基本情報を `users`、個人詳細を `user_demographics`、カルテ本文を `karte_records` から合成する。
- 氏名、フリガナ、メール、会社名、部署、職種、権限、ID は `karte_records` の保存正にしない。
- CSV/PDF出力は既存フロント実装を活かしてよいが、出力対象データは DB から取得した最新カルテを正とする。

### 7.3 下書きAPI

- `GET /api/draft-sessions/:meetingType`
- `PUT /api/draft-sessions/:meetingType`
- `DELETE /api/draft-sessions/:meetingType`

`meetingType` は `initial` または `continuous` のみ許可する。

保存対象:

- `messages`
- `shirp`
- `shirpDetails`
- `survey`
- `conditionSummary`
- `apiUsageCount`
- `feedbackText`
- `conversationStarted`
- `hasSessionStarted`
- `hasFinalizedInitial`
- `continuousMode`
- `initialPromptVariant`

### 7.4 コンディションAPI

- `GET /api/condition-records`
- `POST /api/condition-records`

本番MVPでも現時点では顔分析ロジック未接続のため、同意文付きのスコア保存として扱う。顔画像・動画の生データは保存しない。

保存対象:

- `score`: 0-100
- `level`: `低め`, `標準`, `高め`
- `measuredAt`
- `source`
- `consentVersion`

### 7.5 テナント利用枠API

- `GET /api/tenant-usage`
- `GET /api/admin/tenants/:id/quota`
- `PUT /api/admin/tenants/:id/quota`

本番DBの正は以下の3項目のみとする。

- `totalLimit`: 企業API総回数。デフォルト 1000
- `used`: 企業API使用済み回数。デフォルト 0
- `perMeetingTurnLimit`: 面談1回あたり最大ターン数。デフォルト 100

旧概念である以下は本番DBに作らない。

- `initialMonthlyLimit`
- `continuousMonthlyLimit`
- `initialUsed`
- `continuousUsed`
- `initialLlmCallsPerInterview`
- `continuousLlmCallsPerInterview`

判定:

- 面談開始可否: `totalLimit - used >= perMeetingTurnLimit`
- AI呼び出し可否: `totalLimit - used > 0` かつ `draft_sessions.api_usage_count < perMeetingTurnLimit`
- AI呼び出し成功時: 同一DB transaction 内で `tenant_usage_quotas.used += 1` と `usage_events` 追加を行う。
- 同一面談セッション内では `draft_sessions.api_usage_count` を1回ずつ増やす。

### 7.6 機能フラグAPI

- `GET /api/tenant-feature-flags`
- `GET /api/admin/tenants/:id/feature-flags`
- `PUT /api/admin/tenants/:id/feature-flags`

項目:

- `stressAnalysisEnabled`
- `turnTakingEnabled`
- `lightThemeEnabled`

企業管理者と運用管理者は読み取りのみ。変更できるのはシステム管理者のみ。

### 7.7 管理API

システム管理者:

- `GET /api/admin/tenants`
- `POST /api/admin/tenants`
- `PUT /api/admin/tenants/:id`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/temporary-password`
- `GET /api/admin/password-notifications`
- `POST /api/admin/password-notifications/:id/copy-recorded`

企業管理者:

- `GET /api/company-admin/employees`
- `GET /api/company-admin/employees/:id/karte-records`
- `POST /api/company-admin/employees/:id/temporary-password`
- `GET /api/company-admin/password-notifications`

運用管理者:

- `GET /api/operations-admin/tenants`
- `GET /api/operations-admin/employees`
- `GET /api/operations-admin/employees/:id/karte-records`

キャリアコンサルタント:

- `GET /api/consultant/assigned-users`
- `GET /api/consultant/assigned-users/:id/karte-records`
- `PUT /api/consultant/assigned-users/:id/karte-records/:recordId`

ルール:

- `admin` は全テナントを扱える。
- `company-admin` は自社 `tenant_id` のみ扱える。
- `operations-admin` は `operation_admin_tenants` の範囲のみ扱える。
- `consultant` は `consultant_assignments` の範囲のみ扱える。
- `user` は自分のデータのみ扱える。

## 8. AI API Proxy

### 8.1 Chat Completions

`POST /api/ai/chat`

Express が OpenAI Chat Completions を呼び出す。

固定仕様:

- Model: `gpt-4o-2024-11-20`
- `response_format`: `json_schema` + `strict: true`
- 通常応答 schema: `reply`, `updated_shirp`, `updated_shirp_details`, `is_complete`
- finalize schema: `reply`, `updated_shirp`, `updated_shirp_details`, `feedback`, `is_complete`
- `updated_shirp` の許可キー: `S`, `H`, `I`, `R`, `P`, `#`
- `updated_shirp_details` の許可カテゴリ: `S`, `H`, `I`, `R`
- 各カテゴリ object は strict schema 制約に合わせて全詳細キーを required に含め、値は `string | null` とする。
- `reply` に `updated_shirp`, `updated_shirp_details`, `is_complete`, `feedback` など内部キーが混ざる応答は不正として破棄する。
- refusal、不正JSON、不正キー、不正型の場合は assistant メッセージを追加しない。TTSにも流さない。

クォータ:

- OpenAI 呼び出し前にサーバー側で利用可能回数を検証する。
- 成功した AI 呼び出しは `tenant_usage_quotas.used` と `draft_sessions.api_usage_count` と `usage_events` に反映する。
- OpenAI 側の 400系エラーでは、原因調査に必要な範囲で `error.message` を返す。ただし APIキーや秘密情報を返さない。

### 8.2 Whisper STT

`POST /api/ai/transcriptions`

- OpenAI Whisper STT を呼び出す。
- 音声ファイルは一時ファイルとして永続保存しない。
- サイズ、拡張子、MIME type を検証する。
- レスポンスは `{ "text": "..." }` とする。

### 8.3 OpenAI TTS

`POST /api/ai/tts/openai`

- OpenAI TTS を呼び出す。
- 既存互換として model は `tts-1`、voice は `sage` を基本にする。
- フロント側の `audio.playbackRate` は OpenAI `tts-1` では `1.2` を維持する。
- ユーザーには「再生される音声が AI 生成音声であること」をUI上で明示する。
- 実装・更新時は `openai-tts-1.md` を参照する。

### 8.4 Gemini TTS

`POST /api/ai/tts/gemini`

- Gemini `gemini-2.5-flash-preview-tts:generateContent` を呼び出す。
- 話速は API パラメータではなく `GEMINI_TTS_PROMPT_PREFIX` 相当のプロンプト文字列で制御する。
- フロント側の `audio.playbackRate` は Gemini では `1.0` を維持する。
- 実装・更新時は `gemini-2.5-flash-preview-tts.md` を参照する。

VRM別 voice:

- `sample.vrm`: `Kore`
- `trial_2.vrm`: `Zephyr`
- `young_counsil.vrm`: `Zephyr`

## 9. PostgreSQL データ設計

Migration は SQL ファイルで管理する。例: `server/db/migrations/001_initial.sql`。適用前に必ず XServer VPS のイメージ保存と `pg_dump` を行う。

### 9.1 Enum / Check 制約

DB enum または check 制約で以下を固定する。

- `role`: `user`, `company-admin`, `operations-admin`, `consultant`, `admin`
- `tenant_status`: `active`, `inactive`
- `meeting_type`: `initial`, `continuous`
- `continuous_mode`: `normal`, `turn`
- `condition_level`: `低め`, `標準`, `高め`

### 9.2 テーブル

#### tenants

- `id text primary key`
- `name text not null`
- `status text not null default 'active'`
- `plan text not null default 'standard'`
- `enabled_features jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

#### users

- `id text primary key`
- `email text not null`
- `password_hash text not null`
- `role text not null`
- `tenant_id text references tenants(id)`
- `last_name text not null`
- `first_name text not null`
- `last_name_kana text not null`
- `first_name_kana text not null`
- `company text not null`
- `department text not null default ''`
- `job_title text not null`
- `permission_label text not null`
- `status text not null default 'アクティブ'`
- `karte_status text not null default '未作成'`
- `password_updated_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `unique index users_email_lower_unique on users (lower(email)) where deleted_at is null`
- `index users_tenant_id_idx on users (tenant_id)`
- `index users_role_idx on users (role)`

#### operation_admin_tenants

- `user_id text not null references users(id) on delete cascade`
- `tenant_id text not null references tenants(id) on delete cascade`
- `created_at timestamptz not null default now()`
- primary key: `(user_id, tenant_id)`

#### consultant_assignments

- `consultant_user_id text not null references users(id) on delete cascade`
- `target_user_id text not null references users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- primary key: `(consultant_user_id, target_user_id)`

#### user_demographics

- `user_id text primary key references users(id) on delete cascade`
- `birth_date date`
- `work_location_prefecture text`
- `job_change_count integer`
- `years_of_service integer`
- `gender text`
- `marital_status text`
- `children_count text`
- `youngest_child_age integer`
- `manager_experience text`
- `current_manager text`
- `demographics_skipped boolean not null default false`
- `saved_at timestamptz`
- `updated_at timestamptz not null default now()`

#### tenant_feature_flags

- `tenant_id text primary key references tenants(id) on delete cascade`
- `stress_analysis_enabled boolean not null default false`
- `turn_taking_enabled boolean not null default false`
- `light_theme_enabled boolean not null default false`
- `updated_at timestamptz not null default now()`

#### tenant_usage_quotas

- `tenant_id text primary key references tenants(id) on delete cascade`
- `total_limit integer not null default 1000`
- `used integer not null default 0`
- `per_meeting_turn_limit integer not null default 100`
- `updated_at timestamptz not null default now()`

Constraints:

- `total_limit >= 0`
- `used >= 0`
- `used <= total_limit`
- `per_meeting_turn_limit > 0`

#### karte_records

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null references users(id) on delete cascade`
- `tenant_id text not null references tenants(id)`
- `meeting_type text not null`
- `continuous_mode text`
- `initial_prompt_variant text`
- `status_label text not null default '保存済み'`
- `shirp jsonb not null default '{}'::jsonb`
- `shirp_details jsonb not null default '{}'::jsonb`
- `survey jsonb not null default '{}'::jsonb`
- `condition_summary jsonb`
- `feedback text`
- `conversation_log jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `index karte_records_user_created_idx on karte_records (user_id, created_at desc)`
- `index karte_records_tenant_created_idx on karte_records (tenant_id, created_at desc)`
- `index karte_records_meeting_type_idx on karte_records (meeting_type)`

#### draft_sessions

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null references users(id) on delete cascade`
- `meeting_type text not null`
- `continuous_mode text`
- `initial_prompt_variant text`
- `messages jsonb not null default '[]'::jsonb`
- `shirp jsonb not null default '{}'::jsonb`
- `shirp_details jsonb not null default '{}'::jsonb`
- `survey jsonb not null default '{}'::jsonb`
- `condition_summary jsonb`
- `api_usage_count integer not null default 0`
- `feedback_text text not null default ''`
- `conversation_started boolean not null default false`
- `has_session_started boolean not null default false`
- `has_finalized_initial boolean not null default false`
- `updated_at timestamptz not null default now()`

Constraints:

- unique `(user_id, meeting_type)`
- `api_usage_count >= 0`

#### condition_records

- `id uuid primary key default gen_random_uuid()`
- `tenant_id text not null references tenants(id)`
- `user_id text not null references users(id) on delete cascade`
- `score integer not null`
- `level text not null`
- `measured_at timestamptz not null`
- `source text not null`
- `consent_version text not null`
- `created_at timestamptz not null default now()`

Constraint:

- `score between 0 and 100`

#### usage_events

- `id uuid primary key default gen_random_uuid()`
- `tenant_id text not null references tenants(id)`
- `user_id text not null references users(id)`
- `draft_session_id uuid references draft_sessions(id)`
- `meeting_type text`
- `event_type text not null`
- `amount integer not null default 1`
- `created_at timestamptz not null default now()`

#### password_notifications

- `id uuid primary key default gen_random_uuid()`
- `tenant_id text references tenants(id)`
- `target_user_id text not null references users(id) on delete cascade`
- `issued_by_user_id text not null references users(id)`
- `temporary_password text not null`
- `notification_text text not null`
- `copied_at timestamptz`
- `created_at timestamptz not null default now()`

一時パスワード通知文はアプリ内で作成・コピーする。アプリからメール自動送信はしない。

### 9.3 PostgreSQL 拡張

初期 migration で以下を有効化する。

```sql
create extension if not exists pgcrypto;
```

`gen_random_uuid()` を UUID 主キー生成に使う。

## 10. 初期データ移行

`demo-accounts.json` の内容を本番MVP初期アカウントとして seed してよい。ただし本番では平文 `password` は保存しない。

Seed 方針:

- `accounts[].id` -> `users.id`
- `accounts[].email` -> `users.email`
- `accounts[].role` -> `users.role`
- `accounts[].tenantId` -> `users.tenant_id`
- `accounts[].company` -> `users.company`
- `accounts[].department` -> `users.department`
- `accounts[].jobTitle` -> `users.job_title`
- `accounts[].permission` -> `users.permission_label`
- `accounts[].lastName` / `firstName` / `lastNameKana` / `firstNameKana` -> `users`
- `accounts[].status` -> `users.status`
- `accounts[].karteStatus` -> `users.karte_status`
- `accounts[].managedTenantIds` -> `operation_admin_tenants`

初期テナント:

- `tenant-career-carte-demo`: Career Carte Inc.
- `tenant-connect-systems`: Connect Systems
- `tenant-alpha-robotics`: Alpha Robotics

初期 feature flags:

- `tenant-career-carte-demo`: `stressAnalysisEnabled=true`, `turnTakingEnabled=true`, `lightThemeEnabled=false`
- `tenant-connect-systems`: `stressAnalysisEnabled=false`, `turnTakingEnabled=true`, `lightThemeEnabled=false`
- `tenant-alpha-robotics`: `stressAnalysisEnabled=false`, `turnTakingEnabled=false`, `lightThemeEnabled=false`

初期 quota:

- `totalLimit=1000`
- `used=0`
- `perMeetingTurnLimit=100`

初期パスワード:

- 本番投入時に管理者が一時パスワードを発行する。
- seed 用の仮パスワードを使う場合は初回ログイン後に変更必須フラグを追加してもよい。
- 平文 `demo` は本番DBに保存しない。

## 11. Apache2 設定

必要モジュール:

```bash
sudo a2enmod ssl proxy proxy_http headers rewrite
```

設定例:

```apache
<VirtualHost *:80>
    ServerName example.com
    Redirect permanent / https://example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com

    DocumentRoot /var/www/career-carte-assistant/app/dist

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:3000/api
    ProxyPassReverse /api http://127.0.0.1:3000/api

    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    <Directory /var/www/career-carte-assistant/app/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/career-carte-error.log
    CustomLog ${APACHE_LOG_DIR}/career-carte-access.log combined
</VirtualHost>
```

独自ドメインと証明書は実ドメイン確定後に `example.com` を置き換える。

## 12. systemd 設定

Express アプリは systemd で管理する。

設定例:

```ini
[Unit]
Description=Career Carte Assistant API
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/career-carte-assistant/app
EnvironmentFile=/var/www/career-carte-assistant/shared/.env
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

TypeScript サーバーを使う場合は、`npm run build:server` などで JS にビルドし、systemd はビルド後のエントリを起動する。

## 13. デプロイ・バックアップ

Git 管理に依存せず、XServer VPS のイメージ保存を正とする。変更作業の前に必ずイメージを保存し、復旧点を確保してからアプリ更新、migration、service restart を行う。

標準手順:

```bash
cd /var/www/career-carte-assistant/app
npm ci
npm run lint
npm run build
pg_dump "$DATABASE_URL" > /var/www/career-carte-assistant/shared/backups/career_carte_before_$(date +%Y%m%d_%H%M%S).sql
# SQL migration command here
sudo systemctl restart career-carte-api
sudo apachectl configtest
sudo systemctl reload apache2
```

ルール:

- 変更前に XServer VPS 管理画面でイメージ保存を行う。
- イメージ名には日付、作業目的、作業者が分かる名前を付ける。
- migration 前に `pg_dump` を取得する。
- migration は SQL ファイルを順番に適用する。
- 失敗時に戻せるよう、DB backup、イメージ名、作業日時、変更内容を記録する。
- 大きな変更では、作業前イメージに加えて、動作確認後の安定版イメージも保存する。

## 14. セキュリティ要件

本番MVPで最低限満たすこと:

- HTTPS必須
- APIキーをブラウザへ露出しない
- パスワードは bcrypt でハッシュ化して保存
- Cookie は `httpOnly`, `secure`, `sameSite=lax`
- CSRF対策を実装する
- CORS は `APP_ORIGIN` のみ許可する
- Express に request size limit を設定する
- 音声アップロードのサイズ・拡張子・MIME を検証する
- API rate limit を設定する
- ロール・テナント境界をサーバー側で検証する
- エラーレスポンスに秘密情報を含めない
- 顔画像・動画などの生データを保存しない
- DB接続ユーザーはアプリ用の最小権限ユーザーにする
- `.env` と backup dump は Apache2 の DocumentRoot 外に置く
- 本番データをローカル開発環境に持ち出す場合は、個人情報と会話ログを匿名化する

## 15. 確認項目

### 15.1 ローカル・CI相当

```bash
npm run lint
npm run build
```

### 15.2 VPS

```bash
sudo systemctl status career-carte-api
sudo apachectl configtest
sudo systemctl status apache2
psql "$DATABASE_URL" -c "select 1;"
```

ブラウザ確認:

- `https://example.com/login`
- `https://example.com/admin/login`
- `https://example.com/user`
- `https://example.com/app/initial`
- `https://example.com/company-admin`
- `https://example.com/operations-admin`
- `https://example.com/consultant`
- `https://example.com/admin`

確認内容:

- BrowserRouter の直URLアクセスで 404 にならない。
- 未ログイン保護ページが適切なログイン画面へリダイレクトされる。
- `returnTo` が維持される。
- ロール別アクセス制御が効く。
- 企業管理者の既定遷移が `/user` になる。
- 運用管理者は `managedTenantIds` の範囲だけ閲覧できる。
- APIキー入力モーダルが表示されない。
- DevTools Network に OpenAI / Gemini APIキーが露出しない。
- AI面談、STT、TTS がサーバー経由で動作する。
- プロフィール保存、カルテ保存、下書き再開、会話ログが PostgreSQL に保存される。
- CSV/PDF出力が DB 由来の最新カルテを対象にする。
- クォータの `used`, `remaining`, `perMeetingTurnLimit` が画面とDBで一致する。
- AI呼び出しごとに `tenant_usage_quotas.used` と `usage_events` が更新される。
- 面談セッション内の送信上限が `draft_sessions.api_usage_count < perMeetingTurnLimit` で効く。
- 企業管理者は自社テナントの従業員のみ閲覧できる。
- 運用管理者は管理対象企業だけ閲覧できる。
- 管理者はテナント、ユーザー、利用回数、機能フラグを操作できる。

## 16. 実装優先順位

1. Express / PostgreSQL / session / CSRF の土台を追加する。
2. SQL migration と seed を追加する。
3. BrowserRouter と Apache fallback に対応する。
4. OpenAI / Gemini API呼び出しを Express proxy へ移す。
5. DB認証とロール別ルーティングを接続する。
6. プロフィール、カルテ、下書き、会話ログを DB 保存へ移す。
7. テナント別 quota、`usage_events`、機能フラグを DB 保存へ移す。
8. 管理者、企業管理者、運用管理者、コンサルタントAPIを接続する。
9. 本番デプロイ手順、バックアップ、ログ、監視を整える。

## 17. 判断に迷った場合

- アプリ仕様は `AGENTS.md` を優先する。
- VPS移行・本番化の技術方針は本ファイルを優先する。
- APIキーや個人情報をブラウザに保存する実装は採用しない。
- 通常ログインはメール完全一致を正とし、ロール選択はさせない。
- 管理者ログインは通常ログインと入口を分ける。
- 企業API枠はテナント単位の `totalLimit`, `used`, `perMeetingTurnLimit` を正とする。
- テナント境界とロール制御は必ずサーバー側で保証する。
- 変更前バックアップは XServer VPS のイメージ保存と `pg_dump` を優先する。
- Ubuntu 26.04 LTS を前提にし、OS更新時は PGDG codename と依存パッケージを必ず見直す。
