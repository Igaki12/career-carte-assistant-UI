# Career Karte Assistant - VPS本番MVP移行エージェント指示書

このファイルは、Codex CLI が XServer VPS 上で Career Karte Assistant を本番MVPとして立ち上げるための専用指示書である。既存の `AGENTS.md` はアプリ仕様の正本として参照し、本ファイルは VPS / Express / PostgreSQL / Apache2 / BrowserRouter 化に関する実装・運用方針を補足する。

## 1. 目標

現在の GitHub Pages デモ版を、以下の構成のウェブアプリへ移行する。

- Hosting: XServer VPS
- OS: Ubuntu 25.04
- Frontend: React + Vite + Chakra UI + BrowserRouter
- Backend: Node.js + Express
- Reverse Proxy / HTTPS: Apache2
- DB: PostgreSQL
- Deploy: Git管理による pull / build / migration / restart
- AI APIキー管理: サーバー環境変数

本番MVPでは、ブラウザに API キーや本番データを保存しない。OpenAI / Gemini の呼び出し、認証、ロール、テナント、カルテ、下書き、会話ログ、利用回数、機能フラグはサーバー側で管理する。

## 2. 重要な前提と注意

### 2.1 Ubuntu 25.04 について

ユーザー指定により Ubuntu 25.04 を前提にする。ただし Ubuntu 25.04 は 2026-01-15 に EOL 済みであり、セキュリティ更新対象外である。本番MVPの作業では暫定環境として扱い、早期に Ubuntu 24.04 LTS または利用可能な最新 LTS へ移行する計画を必ず残す。

根拠:

- Ubuntu 25.04 EOL announcement: https://lists.ubuntu.com/archives/ubuntu-announce/2026-January/000320.html
- Ubuntu Releases: https://releases.ubuntu.com/releases/

### 2.2 既存デモ版から置き換えるもの

現行実装の以下は VPS 本番MVPでは廃止または段階的に置き換える。

- `HashRouter` を `BrowserRouter` に置き換える。
- `docs/` 配下を GitHub Pages 配信物として正にする構成をやめ、Vite の本番ビルドを Apache2 から配信する。
- `localStorage` / `sessionStorage` を本番データの保存先にしない。
- `ApiKeyModal` とブラウザ内 API キー保存を廃止する。
- ブラウザから OpenAI / Gemini へ直接 `fetch` しない。
- ダミー認証 `src/lib/demoAuth.ts` は本番認証へ置き換える。
- デモ用保存 `src/lib/demoUserState.ts` は PostgreSQL API へ置き換える。
- デモ用クォータ `src/lib/demoUsageQuota.ts` のメモリ状態は PostgreSQL 管理へ置き換える。

### 2.3 維持するアプリ仕様

画面構成、ロール別導線、SHIRPカルテ仕様、初回面談/継続面談の仕様、VRM運用、音声合成方針は `AGENTS.md` を正とする。VPS移行中に仕様判断が必要な場合は、先に `AGENTS.md` を確認する。

## 3. 本番MVPアーキテクチャ

### 3.1 実行構成

推奨構成:

- Apache2
  - 80番を443番へリダイレクト
  - HTTPS終端
  - React SPA の静的ファイル配信
  - `/api` を Express へ reverse proxy
  - BrowserRouter の直URLアクセスを `index.html` へ fallback
- Express
  - `127.0.0.1:${PORT}` で待ち受け
  - 認証、セッション、DB API、AI API proxy を担当
  - OpenAI / Gemini APIキーは環境変数から読む
- PostgreSQL
  - 認証、テナント、カルテ、会話ログ、下書き、利用回数、機能フラグを保存
- systemd
  - Express アプリをサービスとして常駐
  - `restart=always` を設定

### 3.2 ディレクトリ例

VPS上の配置例:

```text
/var/www/career-carte-assistant/
  app/                  # Git cloneしたリポジトリ
  releases/             # 必要ならリリース単位の退避先
  shared/
    .env                # サーバー環境変数。Git管理しない
    logs/
    backups/
```

実際の配置は運用者の既存ルールに合わせてよい。ただし `.env`、DB dump、ログ、秘密鍵は Git に含めない。

## 4. 環境変数

Express は以下の環境変数を読む。

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://career_carte_app:CHANGE_ME@127.0.0.1:5432/career_carte
SESSION_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
APP_ORIGIN=https://example.com
COOKIE_SECURE=true
```

ルール:

- `OPENAI_API_KEY` と `GEMINI_API_KEY` はサーバー環境変数で管理し、フロントエンドへ渡さない。
- `.env` は VPS 上のみに置き、Git 管理しない。
- `SESSION_SECRET` は十分に長いランダム値を使う。
- 本番HTTPSでは `COOKIE_SECURE=true` を必須にする。
- `APP_ORIGIN` は実ドメインに置き換える。
- 独自ドメイン未確定時の例示では `example.com` を使い、実作業時に必ず置換する。

## 5. フロントエンド移行方針

### 5.1 Router

`src/main.tsx` の `HashRouter` を `BrowserRouter` に置き換える。

期待するURL:

- `/login`
- `/admin/login`
- `/user`
- `/user/demographics`
- `/app/initial`
- `/app/continuous`
- `/company-admin`
- `/admin`
- `/consultant`

Apache2 で SPA fallback を設定し、上記URLを直接開いても `index.html` が返るようにする。

### 5.2 APIキーUIの廃止

本番MVPでは `src/components/ApiKeyModal.tsx` をユーザーに表示しない。OpenAI / Gemini APIキーの入力欄、ブラウザ保存、`cca-openai-api-key`、`cca-gemini-api-key`、`cca-api-key` の利用は廃止する。

移行中は互換コードが残っていてもよいが、本番導線で APIキー入力を要求してはいけない。

### 5.3 AI fetch の置き換え

ブラウザから外部AI APIへ直接アクセスしない。既存の `src/components/MeetingRoom.tsx` にある OpenAI / Gemini 直接呼び出しは、以下の Express API 経由へ置き換える。

- Chat Completions: `POST /api/ai/chat`
- Whisper STT: `POST /api/ai/transcriptions`
- OpenAI TTS: `POST /api/ai/tts/openai`
- Gemini TTS: `POST /api/ai/tts/gemini`

レスポンス形式は既存UIが扱いやすい形を優先する。

- Chat: JSON
- Transcription: JSON `{ "text": "..." }`
- OpenAI TTS: audio blob
- Gemini TTS: audio blob または base64 JSON。ただしフロント側の処理が単純になるなら audio blob を優先する。

### 5.4 localStorage 依存の置き換え

本番MVPでは以下の保存先を PostgreSQL API に移行する。

- 認証セッション
- プロフィール
- 最新カルテ
- 保存済みカルテ履歴
- 会話ログ
- 初回/継続面談の下書き
- テナント
- 企業別機能フラグ
- コンディション記録
- 企業管理者向け従業員カルテ一覧
- 面談利用回数
- AI使用可能回数

移行期間中にデモ互換を残す場合でも、本番フラグでは DB API を正とする。

## 6. Express API設計

### 6.1 認証API

最低限以下を実装する。

- `POST /api/auth/login`
  - input: `accountId`, `password`, `role?`, `remember?`
  - DB上のユーザーを検証し、サーバー側セッションを作成する。
  - ロールは DB に保存された値を正とし、クライアント指定だけで権限を決めない。
- `POST /api/auth/logout`
  - セッションを破棄する。
- `GET /api/auth/session`
  - 現在のログイン状態、アカウントID、ロール、テナントIDを返す。

セッション方針:

- Cookie は `httpOnly`, `sameSite=lax`, `secure=true` を基本にする。
- 本番ではパスワードを平文保存しない。bcrypt などでハッシュ化する。
- 一般ユーザーの自己登録は初期MVPでは実装せず、管理者がアカウントを作成する。

### 6.2 ユーザー・プロフィールAPI

- `GET /api/me/demographics`
- `PUT /api/me/demographics`

プロフィール項目は `src/types.ts` の `DemographicData` に合わせる。数値入力項目はDB保存時に型を正規化してよいが、フロント返却時は既存UIが扱える形を維持する。

### 6.3 カルテAPI

- `GET /api/karte-records`
- `POST /api/karte-records`
- `GET /api/karte-records/latest`

保存対象:

- `KarteData`
- `meetingType`
- `continuousMode`
- `feedback`
- `conversationLog`
- `atCreated`
- `atUpdated`
- `statusLabel`

CSV/PDF出力は既存フロント実装を活かしてよいが、出力対象データは DB から取得した最新カルテを正とする。

### 6.4 下書きAPI

- `GET /api/draft-sessions/:meetingType`
- `PUT /api/draft-sessions/:meetingType`
- `DELETE /api/draft-sessions/:meetingType`

`meetingType` は `initial` または `continuous` のみ許可する。

保存対象:

- 会話履歴
- カルテ途中状態
- API使用回数
- 進行状態
- フィードバック文
- 面談開始済みフラグ
- 面談回数消費済みフラグ

### 6.5 AI API proxy

Express は以下を実装し、外部AI APIへのリクエストをサーバー側で行う。

- `POST /api/ai/chat`
  - OpenAI Chat Completions を呼び出す。
  - モデルは既存仕様どおり `gpt-4o-2024-11-20` を使う。
  - `response_format` は `json_schema` + `strict: true` の Structured Outputs を維持する。
  - refusal、不正JSON、内部キー混入チェックなど既存ガードを維持する。
- `POST /api/ai/transcriptions`
  - OpenAI Whisper STT を呼び出す。
  - 音声ファイルは一時ファイルとして永続保存しない。
- `POST /api/ai/tts/openai`
  - OpenAI TTS を呼び出す。
  - 既存仕様に合わせ、モデルは `tts-1`、voice は `sage` を基本にする。
- `POST /api/ai/tts/gemini`
  - Gemini TTS を呼び出す。
  - `gemini-2.5-flash-preview-tts` と既存の voice 対応表を維持する。

重要:

- APIキーをレスポンス、ログ、エラー詳細に出さない。
- 400系エラーでは原因調査に必要な範囲で OpenAI / Gemini の `error.message` を返す。
- 利用回数・AI使用可能回数はサーバー側で検証する。フロント表示だけに依存しない。

### 6.6 管理者・企業管理者API

最低限以下のカテゴリを用意する。

- users
  - アカウント作成、ロール設定、テナント所属、停止/有効化
- tenants
  - 企業テナント一覧、作成、更新
- quotas
  - 初回面談月間上限
  - 継続面談月間上限
  - 初回面談1回あたりのAI使用可能回数
  - 継続面談1回あたりのAI使用可能回数
- feature-flags
  - `stressAnalysisEnabled`
  - `turnTakingEnabled`
  - `lightThemeEnabled`
- employees
  - 企業管理者が自社テナントの従業員カルテを検索、並び替え、閲覧、PDF出力できるようにする。

ロール制御:

- `admin` は全テナントを扱える。
- `company-admin` は自社テナントのみ扱える。
- `consultant` は担当ユーザー範囲のみ扱える設計にする。
- `user` は自分のデータのみ扱える。

## 7. PostgreSQL データ設計方針

初期MVPでは、以下のテーブル群を目安にする。ORMの採用有無は実装時に決めてよいが、migration は必ず Git 管理する。

- `tenants`
- `users`
- `sessions` またはセッションストア
- `user_demographics`
- `karte_records`
- `draft_sessions`
- `condition_records`
- `tenant_feature_flags`
- `usage_quotas`
- `usage_events`

データ方針:

- JSON構造が大きい `KarteData`, `shirpDetails`, `conversationLog` は `jsonb` を使用してよい。
- 検索・絞り込みに使う項目は通常カラムとして持つ。
- すべての主要テーブルに `created_at`, `updated_at` を持たせる。
- テナント境界を越えた参照が起きないよう、API層で必ず `tenant_id` を検証する。
- 削除は初期MVPでは論理削除を優先する。

## 8. Apache2 設定方針

Apache2 は以下を担当する。

- `http://example.com` を `https://example.com` へリダイレクト
- TLS証明書の設定
- Viteビルド成果物の配信
- `/api` を Express へ proxy
- BrowserRouter の fallback

設定イメージ:

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

必要モジュール:

```bash
sudo a2enmod ssl proxy proxy_http headers rewrite
```

独自ドメインと証明書は実ドメイン確定後に `example.com` を置き換える。

## 9. systemd 設定方針

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

実装で TypeScript サーバーを使う場合は、`npm run build:server` などで JS にビルドし、systemd はビルド後のエントリを起動する。

## 10. デプロイ手順

標準手順:

```bash
cd /var/www/career-carte-assistant/app
git pull
npm ci
npm run lint
npm run build
# DB migration command here
sudo systemctl restart career-carte-api
sudo apachectl configtest
sudo systemctl reload apache2
```

ルール:

- Git を正として変更履歴を管理する。
- migration は build / restart 前後の順序を実装に合わせて固定する。
- 失敗時に戻せるよう、DB backup と直前 commit hash を記録する。
- 重要変更前には XServer VPS のイメージ保存も検討する。ただし日常の差分管理は Git を優先する。

## 11. バックアップと運用

最低限の運用要件:

- PostgreSQL の定期 `pg_dump`
- `.env` の安全な別保管
- Apache / Express ログのローテーション
- systemd の死活確認
- SSL証明書の自動更新確認
- OSセキュリティ更新の確認
- Ubuntu 25.04 から LTS への移行計画

バックアップ例:

```bash
pg_dump "$DATABASE_URL" > /var/www/career-carte-assistant/shared/backups/career_carte_$(date +%Y%m%d_%H%M%S).sql
```

本番データをローカル開発環境に持ち出す場合は、個人情報と会話ログを匿名化する。

## 12. セキュリティ要件

本番MVPで最低限満たすこと:

- HTTPS必須
- APIキーをブラウザへ露出しない
- パスワードはハッシュ化して保存
- Cookie は `httpOnly`, `secure`, `sameSite=lax`
- CSRF対策を検討し、Cookieセッションを使う場合は実装する
- CORS は `APP_ORIGIN` のみ許可
- Express に request size limit を設定
- 音声アップロードのサイズ・拡張子・MIME を検証
- API rate limit を設定
- ロール・テナント境界をサーバー側で検証
- エラーレスポンスに秘密情報を含めない
- 顔画像・動画などの生データを保存しない

## 13. 確認項目

実装後に必ず確認する。

### 13.1 ローカル・CI相当

```bash
npm run lint
npm run build
```

### 13.2 VPS

```bash
sudo systemctl status career-carte-api
sudo apachectl configtest
sudo systemctl status apache2
```

ブラウザ確認:

- `https://example.com/login`
- `https://example.com/admin/login`
- `https://example.com/user`
- `https://example.com/app/initial`
- `https://example.com/company-admin`
- `https://example.com/admin`

確認内容:

- BrowserRouter の直URLアクセスで 404 にならない。
- 未ログイン保護ページが適切なログイン画面へリダイレクトされる。
- ロール別アクセス制御が効く。
- APIキー入力モーダルが表示されない。
- DevTools に OpenAI / Gemini APIキーが露出しない。
- AI面談、STT、TTS がサーバー経由で動作する。
- プロフィール保存、カルテ保存、下書き再開、利用回数消費が PostgreSQL に保存される。
- 企業管理者は自社テナントの従業員のみ閲覧できる。
- 管理者はテナント、ユーザー、利用回数、機能フラグを操作できる。

## 14. 実装時の優先順位

1. Express / PostgreSQL / session の土台を追加する。
2. BrowserRouter と Apache fallback に対応する。
3. OpenAI / Gemini API呼び出しを Express proxy へ移す。
4. DB認証とロール別ルーティングを接続する。
5. プロフィール、カルテ、下書き、会話ログを DB 保存に移す。
6. 利用回数、AI使用可能回数、機能フラグを DB 保存に移す。
7. 管理者・企業管理者APIを接続する。
8. 本番デプロイ手順、バックアップ、ログ、監視を整える。

## 15. 判断に迷った場合

- アプリ仕様は `AGENTS.md` を優先する。
- VPS移行・本番化の技術方針は本ファイルを優先する。
- APIキーや個人情報をブラウザに保存する実装は採用しない。
- テナント境界とロール制御は必ずサーバー側で保証する。
- Ubuntu 25.04 固有の問題に遭遇した場合は、回避策より LTS 移行を優先して検討する。
