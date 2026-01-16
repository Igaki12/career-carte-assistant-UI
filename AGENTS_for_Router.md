
# AGENTS_for_Router.md

## Project Migration Design: Multi-Role SPA Refactoring & Future VPS Roadmap

### 1. 概要 (Overview)

現在の単一機能Reactアプリを、将来的な拡張性とVPS運用を見据えた **役割別 SPA (Single Page Application)** 構成へリファクタリングする。

今回の改修では、**ランディングページ (Home)** を入り口とし、ユーザー・コンサルタント・管理者それぞれの専用ダッシュボードへ遷移する構成とする。
当面は GitHub Pages (`/docs` ディレクトリビルド) での運用を継続するため `HashRouter` を採用するが、将来的に `BrowserRouter` (VPS/Node.js環境) へスムーズに移行できる設計とする。

### 2. 技術スタック (Tech Stack)

  * **Frontend:** React (Vite), Chakra UI
  * **Routing:** React Router DOM (v6)
  * **Hosting (Current):** GitHub Pages (Static /docs)
  * **Hosting (Future):** VPS (Ubuntu/CentOS) + Node.js (Express) + Apache2 (Reverse Proxy) + DB

-----

### 3. ディレクトリ構成の変更 (Directory Structure)

役割ごとにページコンポーネントを分割し、将来的な権限管理（AuthGuard）を見据えた構成にする。

```text
src/
├── components/           # 共通UIコンポーネント (Header, Button, Cardなど)
├── features/             # (Optional) 機能ごとのロジック
├── pages/                # ルーティング単位のページコンポーネント
│   ├── Home.tsx          # ランディングページ & ログイン入り口
│   ├── UserHome.tsx      # 【一般ユーザー用】ダッシュボード
│   ├── ConsultantHome.tsx # 【コンサルタント用】ダッシュボード
│   ├── Admin.tsx         # 【管理者用】管理画面
│   └── AIMeetingRoom.tsx # AI面談機能（既存アプリの移植先）
├── App.tsx               # ルーティング定義 (Routes)
├── main.tsx              # エントリーポイント (HashRouter設定)
└── ...
```

-----

### 4. ページ詳細と機能要件 (Page Requirements)

#### A. Home.tsx (Landing Page)

全てのユーザーの入り口となるトップページ。

  * **主な役割:** サービス紹介、各ロールへの遷移。
  * **実装内容:**
      * ヒーローエリア（キャッチコピー等）。
      * **仮設リンクボタン:** UserHome, ConsultantHome, Admin への直接リンク（開発用）。
      * **主要CTA:** AI面談ルーム (`/app`) への遷移ボタン。
      * **将来のTODO:** ログインフォーム（ID/Pass）の実装。認証成功後に各Homeへリダイレクトするロジックの配置場所となる。

#### B. UserHome.tsx (User Dashboard)

一般ユーザー（求職者・社員など）のマイページ。

  * **表示データ:**
      * ID, 名前, 会社名, 職種, ステータス, タグ
      * 月間面談上限/残り、LLM使用回数/面談
      * アカウント詳細（メール等）は折りたたみ表示
  * **実装機能:**
    1.  **AI面談スタート:** `AIMeetingRoom.tsx` への遷移ボタン。
    2.  **カルテ確認・出力:** 過去の面談結果（カルテ）の閲覧とCSV/PDFダウンロード（ダミー）。
    3.  **アカウント情報確認:** 自身の登録情報の閲覧。パスワードのリセットモーダル（ダミー）を用意。
    4.  **カルテ閲覧（モーダル）:** 最新カルテは詳細表示と編集、過去カルテは作成日/ステータス/Aのみの簡易表示。
    5.  **ユーザアンケート:** 25問（全問リッカート形式）。前回スコア表示と前回回答の編集導線を用意。1問4点換算で100点満点。

#### C. ConsultantHome.tsx (Consultant Dashboard)

キャリアコンサルタント用の管理画面。

  * **表示データ:**
      * ID, 名前, 会社名, 役職, Role, ステータス, タグ
      * 担当ユーザー一覧（担当ユーザー名/会社/職種/最終面談/フォーカス/ステータス）
  * **実装機能:** 
    1.  **対象ユーザカルテ閲覧・修正:** 担当するユーザーのカルテを確認し、最新カルテのA〜G項目を編集できる機能。
    2.  **コンサルアカウント確認:** 自身の情報閲覧。パスワードのリセットモーダル（ダミー）。
    3.  **メール問い合わせ:** 管理者または担当ユーザーへの問い合わせフォーム起動（宛先/件名/本文）。
    4.  **クライアントAI練習面談:** クリック時に「準備中」トーストを表示。
    5.  **カルテ閲覧（モーダル）:** 最新カルテは詳細表示と編集、過去カルテは作成日/ステータス/Aのみの簡易表示。

#### D. Admin.tsx (Administrator Dashboard)

システム全体の管理画面。

  * **実装機能:**
    1.  **アカウント管理:** ユーザー/コンサルタントの一覧をテーブル表示。検索、ステータスフィルタ、ソート、チェックボックス選択・全件選択に対応。
    2.  **アカウント追加 (ユーザー / コンサルタント):** 個別追加フォーム（氏名・メール・会社・ロール・ステータス）とCSV一括追加モーダル（プレビュー/確認付き）を用意。
    3.  **編集機能:** 行単位の編集モーダルと一括編集モーダルを実装。月間面談上限/残り、LLM使用回数/面談を編集可能。
    4.  **列情報:** 面談上限/残り、LLM使用回数/面談、操作ログ件数を表示。
    5.  **パスワード再発行:** 行アクションでダミー通知を表示。

#### E. AIMeetingRoom.tsx (Core Feature)

  * **内容:** 既存の `App.tsx` にある「AI面談チャット機能」一式。

-----

### 5. 追加提案：一般的なB2B/HRアプリ機能 (Feature Suggestions)

上記要件に加え、今後検討すべき機能を提案します。

| カテゴリ | 機能名 | 解説 |
| :--- | :--- | :--- |
| **セキュリティ** | パスワードリセット機能 | 管理者の手を煩わせないための必須機能。 |
| **セキュリティ** | 操作ログ (Audit Log) | 「誰がいつ誰のカルテを見たか」の記録。プライバシー情報の扱いにおいて重要。 |
| **UX/通知** | ステータス管理 | ユーザーの状況（未面談・面談中・完了・要確認）を可視化するバッジ表示。 |
| **通知** | メール/Slack通知 | ユーザーが面談を完了した際、担当コンサルタントへ自動通知する機能。 |
| **規約** | 利用規約・プライバシーポリシー | 企業導入時に必須となる法的文書ページへのリンク。 |
| **管理** | お知らせ配信 (News) | Adminから全ユーザーまたは特定ロールへメッセージを表示する機能。 |

-----

### 6. 実装ステップ (Implementation Steps)

#### Phase 1: 依存関係の追加

- `react-router-dom` 導入済み。

#### Phase 2: コンポーネントの分離・作成

1.  **`AIMeetingRoom.tsx`**: 既存ロジックを移動済み。
2.  **`Home.tsx`**: ランディングページUI作成済み（Chakra UI使用）。
3.  **`UserHome.tsx`, `ConsultantHome.tsx`, `Admin.tsx`**: それぞれの要件に基づいたUIを実装済み。

#### Phase 3: ルーティングの実装

**`src/App.tsx` (Routing Definition)**

```tsx
import { Box } from '@chakra-ui/react';
import { Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import AIMeetingRoom from './pages/AIMeetingRoom';
import ConsultantHome from './pages/ConsultantHome';
import Home from './pages/Home';
import UserHome from './pages/UserHome';

function App() {
  return (
    <Box minH="100vh" bg="gray.900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user" element={<UserHome />} />
        <Route path="/consultant" element={<ConsultantHome />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/app" element={<AIMeetingRoom />} />
      </Routes>
    </Box>
  );
}

export default App;
```

-----

### 7. 将来的なVPS移行へのロードマップ (Future Roadmap: VPS Migration)

将来、Node.jsバックエンドやDBを導入し、VPS (Apache2) で公開する際の変更点メモ。（変更なし）

#### A. フロントエンドの変更 (React)

1.  **Routerの変更:** `HashRouter` → `BrowserRouter` (SEO, URL美化)。
2.  **API通信:** 環境変数 (`VITE_API_URL`) で接続先を管理。

#### B. サーバー構成 (VPS / Apache2 / Node.js)

  * **Apache Reverse Proxy:** フロントエンド(80)へのアクセスと、API(3000)へのアクセスを振り分ける。
  * **Fallback設定:** SPA特有の404エラーを防ぐため、実ファイルが存在しないパスは全て `index.html` へRewriteする設定を入れる。

*(詳細なApache設定例は前バージョンを参照)*

#### C. デプロイフロー

1.  **Local:** `npm run build`
2.  **VPS:** `/var/www/your-app/dist` に配置。

-----

### 8. SSOディープリンク設計メモ (Post-VPS Implementation)

VPS移行後に実装する前提で、既存サービスからUserHomeへSSOディープリンクで遷移できるようにする。

#### A. ルーティング方針

- 現在の `/#/user` から **ID由来のアドレス** へ移行する。
- 例（VPS移行後・BrowserRouter想定）: `/user/:userId`  
- GitHub Pages運用時のHashRouter例: `/#/user/:userId`

#### B. SSO遷移URL例

- `https://app.example.com/user/USR-2024-021?token=SSO_TOKEN`
- tokenは短命・ワンタイムを想定し、署名検証を行う。

#### C. フロント側の処理

- `useParams()` で `userId` を取得。
- `useSearchParams()` で `token` を取得。
- `token` がある場合は `POST /auth/sso/exchange` などで検証し、セッションを確立。
- 失敗時はエラー表示またはログイン/エラーページへ遷移。

#### D. バックエンド側の処理

- `token` の署名・有効期限・ワンタイム利用を検証。
- `userId` との整合性を確認。
- 成功時にフロント用セッション（JWT or HttpOnly Cookie）を返却。

#### E. セキュリティ注意点

- 生のID露出を避けたい場合は、推測不能IDや署名付きIDを採用する。
- ディープリンクは短命・ワンタイム運用を前提にする。

-----

### 9. Vite設定 (Current Status)

GitHub Pages用の設定を維持。

```ts
export default defineConfig({
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  plugins: [react()],
})
```

-----

### 解説：設計のポイント

  * **拡張性:** 最初からページを `User`, `Consultant`, `Admin` に分けておくことで、将来「コンサルタントだけに見せたいデータ」などが発生した際、コードの混在を防げます。
  * **Homeの役割:** 将来的に `Home.tsx` に認証ロジック（Firebase Authや自社認証）を組み込みます。「ログインしていれば各Homeへ、していなければログイン画面へ」という分岐はこのコンポーネントまたは `App.tsx` のGuardコンポーネントで行います。
  * **VPS準備:** VPS移行時の最大の障壁である「ルーティング設定（404問題）」に対する解決策を設計段階で保持しています。
