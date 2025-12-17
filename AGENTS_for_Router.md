
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
│   └── AppMain.tsx       # AI面談機能（既存アプリの移植先）
├── App.tsx               # ルーティング定義 (Routes)
├── main.tsx              # エントリーポイント (Router設定)
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
      * **将来のTODO:** ログインフォーム（ID/Pass）の実装。認証成功後に各Homeへリダイレクトするロジックの配置場所となる。

#### B. UserHome.tsx (User Dashboard)

一般ユーザー（求職者・社員など）のマイページ。

  * **表示データ:**
      * ID, 名前, 会社名, 職種, Role, ステータス, タグ
  * **実装機能:**
    1.  **AI面談スタート:** `AppMain.tsx` への遷移ボタン。
    2.  **アカウント情報確認:** 自身の登録情報の閲覧。パスワードのリセット機能。
    3.  **カルテ確認・出力:** 過去の面談結果（カルテ）の閲覧とCSV/PDFダウンロード。
    4.  **ユーザアンケート:** フィードバック用フォーム。
    5.  **ニュース通知:** 管理者からのお知らせ表示エリア。

#### C. ConsultantHome.tsx (Consultant Dashboard)

キャリアコンサルタント用の管理画面。

  * **表示データ:**
      * ID, 名前, 会社名, 職種, Role, **担当ユーザー一覧**, ステータス
  * **実装機能:**
    1.  **クライアントAI練習面談:** （未実装・リンクのみ設置予定）コンサルタント自身の練習用モード。
    2.  **コンサルアカウント確認:** 自身の情報閲覧。パスワードのリセット機能。
    3.  **対象ユーザカルテ閲覧・修正:** 担当するユーザーのカルテを確認し、コメント追記や修正を行う機能。
    4.  **メール問い合わせ:** 管理者またはユーザーへの問い合わせフォーム/メーラー起動。
    5.  **ニュース通知:** 管理者からのお知らせ表示エリア。

#### D. Admin.tsx (Administrator Dashboard)

システム全体の管理画面。

  * **実装機能:**
    1.  **ユーザー追加 (CSV一括):** 多数のユーザーを一括登録する機能。
    2.  **アカウント管理:** ユーザー・コンサルタント情報・操作ログの閲覧・修正・削除。絞り込み検索機能。
    3.  **LLM使用回数設定:** ロールや契約プランごとのAI利用上限設定。

#### E. AppMain.tsx (Core Feature)

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

```bash
npm install react-router-dom
```

#### Phase 2: コンポーネントの分離・作成

1.  **`AppMain.tsx`**: 既存ロジックを移動。
2.  **`Home.tsx`**: ランディングページUI作成（Chakra UI使用）。ログイン機能は「Coming Soon」またはモックで配置。
3.  **`UserHome.tsx`, `ConsultantHome.tsx`, `Admin.tsx`**: それぞれの要件に基づいた仮のUI（ボタン配置など）を作成。

#### Phase 3: ルーティングの実装

**`src/App.tsx` (Routing Definition)**

```jsx
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import UserHome from './pages/UserHome'
import ConsultantHome from './pages/ConsultantHome'
import Admin from './pages/Admin'
import AppMain from './pages/AppMain'
import { Box } from '@chakra-ui/react'

function App() {
  return (
    <Box minH="100vh">
      <Routes>
        {/* Public Landing & Login */}
        <Route path="/" element={<Home />} />
        
        {/* Role Based Dashboards */}
        <Route path="/user" element={<UserHome />} />
        <Route path="/consultant" element={<ConsultantHome />} />
        <Route path="/admin" element={<Admin />} />
        
        {/* Core Feature (AI Interview) */}
        {/* 将来的に /app/:sessionId のようにIDを渡す想定 */}
        <Route path="/app" element={<AppMain />} />
      </Routes>
    </Box>
  )
}

export default App
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

### 8\. Vite設定 (Current Status)

GitHub Pages用の設定を維持。

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/YOUR_REPOSITORY_NAME/', 
  build: {
    outDir: 'docs',
  }
})
```

-----

### 解説：設計のポイント

  * **拡張性:** 最初からページを `User`, `Consultant`, `Admin` に分けておくことで、将来「コンサルタントだけに見せたいデータ」などが発生した際、コードの混在を防げます。
  * **Homeの役割:** 将来的に `Home.tsx` に認証ロジック（Firebase Authや自社認証）を組み込みます。「ログインしていれば各Homeへ、していなければログイン画面へ」という分岐はこのコンポーネントまたは `App.tsx` のGuardコンポーネントで行います。
  * **VPS準備:** VPS移行時の最大の障壁である「ルーティング設定（404問題）」に対する解決策を設計段階で保持しています。
