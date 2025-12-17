# AGENTS_for_Router.md
## Project Migration Design: SPA Refactoring & Future VPS Roadmap

### 1. 概要 (Overview)
現在の単一機能Reactアプリを、将来的な拡張性とVPS運用を見据えた **SPA (Single Page Application)** 構成へリファクタリングする。
当面は GitHub Pages (`/docs` ディレクトリビルド) での運用を継続するため、ルーティングには `HashRouter` を採用するが、将来的に `BrowserRouter` (VPS/Node.js環境) へスムーズに移行できる設計とする。

### 2. 技術スタック (Tech Stack)
* **Frontend:** React (Vite), Chakra UI
* **Routing:** React Router DOM (v6)
* **Hosting (Current):** GitHub Pages (Static /docs)
* **Hosting (Future):** VPS (Ubuntu/CentOS) + Node.js (Express) + Apache2 (Reverse Proxy) + DB

---

### 3. ディレクトリ構成の変更 (Directory Structure)

既存のロジックを `features` または `pages` に分離し、関心事を分離する。

```text
src/
├── components/       # 共通UIコンポーネント
├── pages/            # ルーティング単位のページコンポーネント
│   ├── Home.jsx      # [NEW] 親ページ（マイページ/ランディングページ）
│   └── AppMain.jsx   # [MOVED] 既存のアプリ機能をここに移植
├── App.jsx           # ルーティング定義 (Routes)
├── main.jsx          # エントリーポイント (Router, Provider設定)
└── ...
````

-----

### 4. 実装ステップ (Implementation Steps)

#### Phase 1: 依存関係の追加

```bash
npm install react-router-dom
```

#### Phase 2: コンポーネントの分離

1.  **`src/pages/AppMain.jsx` の作成**
      * 現在の `App.jsx` の中身（ビジネスロジックとUI）をまるごと移動する。
      * 必要な `import` 文も移動させること。
2.  **`src/pages/Home.jsx` の作成**
      * ポートフォリオのトップページとして新規作成。
      * Chakra UI を使用し、`/app` への遷移ボタン (`Link` コンポーネント) を配置。

#### Phase 3: ルーティングの実装

**`src/main.jsx` (Entry Point)**
GitHub Pages対策として `HashRouter` を採用する。

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { HashRouter } from 'react-router-dom' // 将来的に BrowserRouter に変更可能
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ChakraProvider>
  </React.StrictMode>,
)
```

**`src/App.jsx` (Routing Definition)**

```jsx
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AppMain from './pages/AppMain'
import { Box } from '@chakra-ui/react'

function App() {
  return (
    <Box>
      {/* 必要に応じて共通ヘッダーなどをここに配置可能 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<AppMain />} />
      </Routes>
    </Box>
  )
}

export default App
```

-----

### 5. 将来的なVPS移行へのロードマップ (Future Roadmap: VPS Migration)

将来、Node.jsバックエンドやDBを導入し、VPS (Apache2) で公開する際の変更点メモ。

#### A. フロントエンドの変更 (React)

1.  **Routerの変更:**
      * `src/main.jsx` の `HashRouter` を `BrowserRouter` に変更する。これにより URL から `#` が消え、SEOや一般的なWebアプリの挙動になる。
2.  **API通信:**
      * Node.js APIへのリクエストには環境変数 (`VITE_API_URL`) を使用し、開発環境(localhost)と本番環境(VPS)で接続先を切り替えられるようにコードを記述しておく。

#### B. サーバー構成 (VPS / Apache2 / Node.js)

静的ファイル配信とAPIサーバーを同居させる構成案。

  * **Apache設定 (Reverse Proxy & SPA Fallback):**
    Apacheをフロントに置き、Reactのビルドファイルへのアクセスと、Node.jsへのAPIリクエストを振り分ける。

    *Apache VirtualHost Config Example:*

    ```apache
    <VirtualHost *:80>
        ServerName your-domain.com
        DocumentRoot /var/www/your-app/dist

        # 1. API Requests -> Node.js (Port 3000)
        ProxyPass /api http://localhost:3000/api
        ProxyPassReverse /api http://localhost:3000/api

        # 2. React SPA Routing Fallback (重要)
        # 実ファイルが存在しないパスへのアクセスはすべて index.html を返す
        <Directory /var/www/your-app/dist>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </Directory>
    </VirtualHost>
    ```

#### C. デプロイフロー

1.  **Local:** `npm run build` でビルド。
2.  **VPS:** 生成された `dist` (または `docs`) フォルダの中身を `/var/www/your-app/dist` に配置。
3.  **Node.js:** バックエンドコードを配置し、PM2などで常時起動。

-----

### 6. Vite設定 (Current Status)

現状の `vite.config.js` は GitHub Pages 用に以下を維持する。

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/YOUR_REPOSITORY_NAME/', // リポジトリ名
  build: {
    outDir: 'docs',
  }
})
```

---

### 解説：将来性についてのポイント

上記の設計図では、**「将来のVPS化」** を考慮して以下の点を盛り込んでいます。

1.  **Routerの置換容易性:** `HashRouter` (GitHub Pages用) と `BrowserRouter` (VPS用) は互換性が高いため、`import` を書き換えるだけで移行できるよう `main.jsx` に集約しています。
2.  **Apacheの設定例:** SPAをApacheで動かす場合、**「実ファイルがないURL（例: `/app`）にアクセスしたときに 404 エラーを出さず、`index.html` に転送してReactに処理させる」** 設定（RewriteRule）が必須になります。この設定例を設計図に含めておくことで、将来「VPSに置いたらページ遷移で404になる」という典型的なトラブルを防げます。
3.  **ProxyPassの想定:** Node.jsをバックエンドにする場合、フロントエンドと同じドメインでAPIを提供するためにApacheの「リバースプロキシ」機能を使うのが一般的です。その構成案も記述しています。

**次のステップ:**
このファイルを保存して、リファクタリングを開始する準備はよろしいでしょうか？必要であれば、最初のステップである「`Home.jsx` の具体的なコード案」などを作成することも可能です。