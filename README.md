# Career Karte Assistant UI

キャリア面談の事前準備、SHIRP形式のキャリアカルテ作成、企業管理者・運用管理者向けカルテ閲覧を行うReact/Vite製のデモSPAです。

## Tech Stack

- React + TypeScript + Vite
- Chakra UI
- React Router + HashRouter
- Three.js + @pixiv/three-vrm
- GitHub Pages配信用ビルド出力: `docs/`

## Development

```bash
npm install
npm run dev
```

Build and validation:

```bash
npm run lint
npm run build
```

## Demo Login

本番認証は未接続です。現在はダミー認証として、通常ログインではデモアカウントのメールアドレスと任意のパスワードでログインできます。

- 通常ログイン: `/#/login`
  - 一般ユーザー、企業管理者、運用管理者、キャリアコンサルタント共通
  - メールアドレスでログイン
  - 利用条件モーダル、同意チェック、権限選択、システム管理者リンクは非表示
  - ログイン維持チェックあり
- 管理者ログイン: `/#/admin/login`
  - システム管理者専用の別入口
  - 管理者画面であることを画面上に明示
  - 管理者利用条件の同意チェックや確認モーダルは非表示

未ログインで保護ページへアクセスすると、通常ページは `/#/login`、管理者ページは `/#/admin/login` へリダイレクトされます。保護ページ右上にはログイン中のロール表示とログアウトボタンが表示されます。

## Main Routes

- `/#/`: 表示用ホーム画面ではなく、ログイン状態とロールに応じて既定ページへリダイレクト
- `/#/user`: 一般ユーザーホーム
- `/#/user/demographics`: プロフィール設定
- `/#/app/initial`: 初回面談
- `/#/app/continuous`: 継続面談
- `/#/company-admin`: 企業管理者ホーム
- `/#/operations-admin`: 運用管理者ホーム
- `/#/admin`: システム管理者画面
- `/#/consultant`: コンサルタント画面

旧ホーム画面 `src/pages/Home.tsx` は廃止済みです。プロフィール設定、初回面談、継続面談の導線は一般ユーザーの `/#/user` に集約しています。

## Demo Storage

GitHub Pagesデモ版ではバックエンドの代わりにブラウザ保存を使います。

- `cca-demo-user-state`: プロフィール、カルテ、下書き、テナント、企業管理者用従業員データなど
- `cca-demo-auth-session`: ダミー認証セッション
  - 「常にログインした状態にしておく」ON: `localStorage`
  - OFF: `sessionStorage`

企業API使用枠・会話ターン制限は `src/lib/demoUsageQuota.ts` のテナント別メモリ状態を正とし、システム管理者画面で企業単位に変更します。リロード時はデフォルト値へ戻ります。

## Notes

詳細な仕様、役割別画面、AI面談フロー、カルテ構造、VRM運用メモは `AGENTS.md` を参照してください。
