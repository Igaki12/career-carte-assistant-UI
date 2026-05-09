# Career Karte Assistant - エージェント設計書

## 1. プロジェクトのゴールと開発方針
現在の単一機能Reactアプリを、将来的な拡張性とVPS運用を見据えた役割別SPA構成へリファクタリングし、統合的なキャリアコンサルタントシミュレータを構築する。
日本型事前問診のスロット充填（初回面談）と、海外アンビエントAIの書記体験（継続面談）を融合したUI/UXを目指し、面談フェーズごとに対話制御を最適化する。

## 2. アプリケーションアーキテクチャ（SPA構成）
### 2.1 技術スタック
- Frontend: React (Vite), Chakra UI, Three.js + @pixiv/three-vrm
- Routing: React Router DOM (v6)
- Hosting (Current): GitHub Pages (Static /docs) + HashRouter
- Hosting (Future): VPS (Ubuntu 26.04 LTS) + Node.js (Express) + Apache2 (Reverse Proxy) + DB (PostgreSQL) + BrowserRouter

### 2.2 役割別ページ構成とルーティング
- Login (`/login`): 一般ユーザー・企業管理者・キャリアコンサルタント共通のダミーログイン画面。任意のID/パスワードで認証を通し、ロール選択により `/user`、`/company-admin`、`/consultant` へ遷移する。利用条件モーダル、利用条件同意チェック、常にログインした状態にしておくチェックを持つ。
- AdminLogin (`/admin/login`): システム管理者専用の別ログイン画面。通常ログイン画面とは入口を分け、画面上で「管理者ログイン」であることを明示する。任意の管理者ID/パスワードで認証を通し、`/admin` へ遷移する。
- Root (`/`): 独立したホーム画面は持たず、ログイン状態に応じてロール別の既定ページへ即時リダイレクトする。未ログイン時は `/login`、一般ユーザーは `/user`、企業管理者は `/company-admin`、キャリアコンサルタントは `/consultant`、システム管理者は `/admin` へ遷移する。旧 `Home.tsx` は廃止済みで、プロフィール設定・初回面談・継続面談の導線は `UserHome` に集約する。
- DemographicsSetup (`/user/demographics`): プロフィール初期設定・編集。未設定時の導線兼、UserHomeからの編集画面。デモ検証用に「デモ用にスキップして進む」を持つ。
- UserHome (`/user`): 一般ユーザー用。初期版では初回面談、カルテ閲覧・出力、プロフィール編集を主要導線とする。継続面談、ユーザーアンケート、面談前コンディションチェックは準備中として disabled 表示にし、開始できない状態にする。ステータスは summary 表示を基本とし、詳細 badge の羅列は表示しない。カルテ出力は最新の保存済みカルテ1件を対象に、ブラウザ経由で CSV / PDF を直接ダウンロードできるようにする。一般ユーザー画面では面談利用回数、残り回数、AI利用可能回数を表示せず、利用状況は管理者・企業管理者画面で確認する。
- ConsultantHome (`/consultant`): コンサルタント用。担当ユーザーのカルテ閲覧・修正、AI練習面談（ロードマップ）。
- Admin (`/admin`): 管理者用。アカウント管理、利用回数（初回/継続を別カラム）設定、面談1回あたりのAI使用可能回数設定、企業別オプション管理。
- CompanyAdminHome (`/company-admin`): 企業管理者用。自社テナントの従業員カルテ一覧、検索、並び替え、一括選択、カルテ表示、個別/一括PDF出力、個別/一括印刷、面談利用回数・会話ターン制限の設定、緊張度スコア表示オプションのON/OFF、コンディション測定件数の集計表示。
- InitialMeetingRoom (`/app/initial`): 初回面談（順次ヒアリング型）。
- ContinuousMeetingRoom (`/app/continuous`): 継続面談（自由対話型）。
- ConditionCheck (`/user/condition-check`): 面談前コンディションチェック。現時点では顔分析ロジック未接続のため、同意文付きのダミースコア保存画面として扱う。

### 2.2.1 ダミー認証・ログイン制御
- 現時点では本番認証未接続のため、`src/lib/demoAuth.ts` のダミー認証を使う。
- 未ログイン状態で保護ページへアクセスした場合、通常ページは `/login?returnTo=...`、管理者ページは `/admin/login?returnTo=...` へ必ずリダイレクトする。
- `/` は表示ページではなく、未ログインなら `/login`、ログイン済みなら `getDefaultRouteForRole(session.role)` の返すロール別既定ページへリダイレクトする。
- ロール別にアクセス可能画面を分離する。`user` は `/user`, `/user/demographics`, `/user/condition-check`, `/app/initial`, `/app/continuous`、`company-admin` は `/company-admin`、`consultant` は `/consultant`、`admin` は `/admin` を対象とする。
- ログイン済みの保護ページ右上には `src/components/AuthNavigation.tsx` の開閉式ナビゲーションを表示する。デフォルトは歯車アイコンボタンの縮小表示とし、初回表示時は展開状態から短時間で縮小して、ナビゲーションの存在が分かるアニメーションを入れる。展開時は `Career Karte Assistant`、アカウントID、ロール、権限内ページリンク、ログアウトボタンを表示する。
- AuthNavigation のページリンクは権限内かつ初期版で利用可能なページのみ表示する。`user` は `/user`, `/user/demographics?returnTo=%2Fuser`, `/app/initial`、`company-admin` は `/company-admin`、`consultant` は `/consultant`、`admin` は `/admin` を表示対象とする。旧 `Home.tsx` は廃止済みのため `/` へのリンクは追加しない。継続面談、ユーザーアンケート、面談前コンディションチェックは初期版ではナビリンクに出さない。
- AuthNavigation の展開/縮小には `framer-motion` を使う。ただし `prefers-reduced-motion` が有効な場合は自動展開プレビューや大きな動きを抑制する。
- 通常ログイン画面は一般ユーザー・企業管理者・キャリアコンサルタント共通入口とし、管理者ログイン画面は別入口にする。企業管理者は一般ユーザーと同じ入口を使う。
- 「常にログインした状態にしておく」がONの場合は `localStorage`、OFFの場合は `sessionStorage` に `cca-demo-auth-session` を保存する。ログアウト時は両方を削除する。
- GitHub Pagesデモ版では任意のパスワードでログインできる状態を維持し、自己再設定や一時パスワード発行はUI確認用として扱う。再設定結果はログイン時の照合には反映しない。
- 一般ユーザー・キャリアコンサルタント本人のパスワード再設定は、アプリ内で現在パスワード確認、新パスワード、確認入力を行う。現在パスワードは空欄不可の確認用入力とし、デモ版では実照合しない。
- 管理者・企業管理者による一時パスワード発行はアプリ内で行い、通知文一覧からコピーして既存の業務メーラーで通知する。アプリからの自動送信機能は持たない。
- 本番実装ではサーバー側セッション/JWT、パスワード検証、ロール、テナントID、監査ログへ置き換える前提とする。

### 2.2.2 UIデザイン方針
- 主要ページは黒・濃紺・スレート系を基調にし、白基調の文字とシルバー系グラデーション装飾で統一する。
- カード状の領域は白い塗りカードや角丸カードを基本とせず、背景は透明または半透明にし、枠線よりも上端の水平グラデーションラインで区切る。上下両方の水平線は原則使わず、上端のみを基本にする。
- `Admin` と `CompanyAdminHome` の管理系パネルは `linePanelProps` のような上端のみのシルバー系グラデーションラインを標準とする。
- テーブル内の小さな操作ボタン（例: 編集、再発行、表示、印刷、PDF）は、暗色背景上で読めるよう白基調の文字色を維持し、disabled 時だけ明確に淡くする。
- 利用条件、カルテ確認・編集、メール問い合わせなどのモーダルはページ全体の黒基調に合わせ、暗色ガラスパネル、角丸なし、上端のシルバー系グラデーションライン、白基調の本文で表示する。広い画面では用途に応じて横幅を広げ、カルテ系モーダルは最大 `1480px` 程度、問い合わせ系モーダルは最大 `1120px` 程度を目安にする。
- モーダル内のフォーム入力も暗色背景に合わせ、ラベル・入力文字・placeholder のコントラストを確保する。ブラウザ標準の select option 以外は白いフォーム部品を残さない。
- 出力系ボタンの文言は省略しない。特に PDF 保存は `PDFとして保存` のように、実行結果が分かる表記にする。
- PrimaryButton は黒系グラデーションを標準とし、disabled または「準備中」状態では波打つアニメーションを止め、押せない状態が分かる静的な見た目にする。

### 2.3 フロント保存方針（GitHub Pages デモ版）
- GitHub Pages デモ版ではバックエンドの代わりに `localStorage` を正とする。
- 現在の共通保存キーは `cca-demo-user-state`。
- 保存対象:
  - `demographics`: プロフィール情報
  - `latestKarte`: 最新カルテ
  - `karteRecords`: 保存済みカルテ履歴
  - `draftSessions.initial` / `draftSessions.continuous`: 未完了面談の下書き
  - `demographicsSkipped`: デモ用プロフィールスキップ状態
  - `tenantId`: 現在ユーザーのデモ用テナントID
  - `tenants`: 企業テナント一覧
  - `featureFlags`: 企業別機能フラグ
  - `conditionRecords`: 面談前コンディションチェックの保存済み測定結果
  - `companyEmployees`: 企業管理者画面のデモ用従業員カルテ一覧
- ダミー認証セッションの保存キーは `cca-demo-auth-session`。ログイン維持ON時は `localStorage`、OFF時は `sessionStorage` に保存する。
- 旧 `cca-karte` は読み込み互換のみ残す。
- 例外: デモ版の面談利用回数・会話ターン制限は `src/lib/demoUsageQuota.ts` のメモリ状態を正とし、`localStorage` へ保存しない。SPA内の画面遷移では同期し、ページリフレッシュ時はデフォルト値へ戻す。
- デモ用クォータ初期値:
  - 初回面談月間上限: 10回
  - 継続面談月間上限: 4回
  - 初回面談のAI使用可能回数: 面談1回あたり10回
  - 継続面談のAI使用可能回数: 面談1回あたり7回

## 3. コア機能：AI面談フローの完全分離
初回面談と継続面談を別ページ・別ロジックとして実装する。

### 3.1 初回面談ページ（`/app/initial`）
- 目的: SHIRPベースのカルテを作成。
- 事前条件: プロフィール未設定かつ `demographicsSkipped` が false の場合は `/user/demographics?returnTo=/app/initial` へ誘導する。デモ用スキップ済みの場合は初回面談へ進める。
- 制御: 大分類は `S -> H -> I -> R` の順を維持するが、実際の進行単位は二段目の詳細要約ごとの固定順とする。初回の必須ステップは `S.externalConditions -> S.jobContent -> S.relationshipsAndOrgFit -> S.selfEvaluationAndAcceptance -> H.treatmentPreferences -> H.workPreferences -> H.workStylePreferences -> H.selfRealizationPreferences -> I.capabilityExperienceIssues -> I.healthLifeConstraints -> I.psychologicalIssues -> I.organizationalEnvironmentalConstraints -> R.capabilityResources -> R.interpersonalResources -> R.psychologicalResources -> R.environmentalResources -> R.fitResources` とする。三段目の具体項目は会話から自然に抽出できる場合だけ補記し、未入力でも完了条件には含めない。`#` は引き続き自由記述として扱う。
- 通信: MediaRecorder -> Whisper(STT) -> GPT-4o -> TTS-1。
- 事前読込: 保存済みプロフィール情報を `karte.demographics` に注入した状態で開始する。
- 途中保存: 会話履歴、カルテ、API使用回数、進行状態を `draftSessions.initial` に自動保存する。
- 再開: UserHome から初回面談開始時、下書きがあれば「続きから再開 / 新規開始」を選ばせる。
- 完了動線: 面談中にカルテ確認・保存を行い、保存後はUserHomeへ遷移。
- 表示: 企業別 `featureFlags.stressAnalysisEnabled` が true の場合、ルーム概要付近に面談前コンディション（緊張度スコア）を表示する。未測定時は「未測定」とチェック導線を表示する。
- 進行度表示: VRMステージ上の「カルテ進行度」は初回面談の必須詳細17項目を母数として `%` を算出する。デフォルトでは `% 完成` のみ表示し、親Boxをクリックまたはタップした時だけ `x / 17 項目完了` と現在の詳細項目ラベルを展開表示する。
- 利用回数: 初回面談の残り回数が0回の場合は開始不可とする。UserHomeからの開始操作時とMeetingRoom直アクセス時の両方で、原因が分かる toast を表示する。面談回数の消費タイミングは、面談画面で最初のテキスト送信または音声送信を行った時点とし、同一面談セッション内では1回だけ消費する。
- 会話ターン制限: 初回面談のAI使用可能回数は、デフォルトでは面談1回あたり10回とする。管理者画面または企業管理者画面で変更した値を `MeetingRoom` の送信可能回数に連動させる。

### 3.2 継続面談ページ（`/app/continuous`）
- 初期版では準備中扱いとし、UserHome と AuthNavigation から開始導線を出さない。正式有効化まではユーザーが通常導線から利用できない状態を維持する。
- 目的: 自由対話で既存カルテを更新し、面談後フィードバックを提示。
- カルテ処理: 初回面談で保存されたカルテを事前ロード。
- 通信方式選択（UserHome）:
  - 通常モード: Whisper + GPT-4o + TTS-1
  - ターンテイキングモード: Realtime API想定（現時点はUI表示のみ、課金表記拡張余地あり）
- 途中保存: 会話履歴、カルテ、API使用回数、進行状態を `draftSessions.continuous` に自動保存する。
- 再開: UserHome から継続面談開始時、下書きがあれば「続きから再開 / 新規開始」を選ばせる。
- 完了動線: カルテ保存後はUserHomeへ遷移。
- 表示: 企業別 `featureFlags.stressAnalysisEnabled` が true の場合、ルーム概要付近に面談前コンディション（緊張度スコア）を表示する。未測定時は「未測定」とチェック導線を表示する。
- 利用回数: 継続面談の残り回数が0回の場合は開始不可とする。UserHomeからの開始操作時とMeetingRoom直アクセス時の両方で、原因が分かる toast を表示する。面談回数の消費タイミングは、面談画面で最初のテキスト送信または音声送信を行った時点とし、同一面談セッション内では1回だけ消費する。
- 会話ターン制限: 継続面談のAI使用可能回数は、デフォルトでは面談1回あたり7回とする。管理者画面または企業管理者画面で変更した値を `MeetingRoom` の送信可能回数に連動させる。

#### 3.2.1 ターンテイキングモード実装方針
- 方針: 「会話しながら常時カルテ更新」は行わず、終了時に1回だけカルテを要約更新する。
- 更新ロジック: 既存の `handleFinalizeContinuous` に近い形で実装する。
- 参照ドキュメント: Realtime API実装時は公式ドキュメントのコピー `realtime-api-websocket-official-document.md` を参照する。
- 実装フロー:
  - ターンテイキング中は「過去カルテ表示 + 会話のみ」で進行する。
  - 「面談を終了してフィードバックを見る」ボタン押下でターンテイキングを終了する。
  - Realtimeセッションの会話履歴（テキスト）を取得する。
  - 取得した履歴 + 既存カルテを入力として、1回だけ要約/更新を実行する（`updated_shirp` と `feedback` を生成）。
- 生成後は「カルテ確認 -> 保存 -> UserHomeへ戻る」の順で完了する。

### 3.2.2 OpenAI会話応答実装メモ
- 面談中の会話応答生成は `src/components/MeetingRoom.tsx` の `runLLMProcess` から `https://api.openai.com/v1/chat/completions` を呼び出している。
- 会話応答モデルは `gpt-4o-2024-11-20` に固定する。
- OpenAI 応答の `response_format` は `json_object` ではなく、`json_schema` + `strict: true` の Structured Outputs を使う。
- schema は通常応答用と finalize 用で分け、最低限以下を返させる。
  - 通常応答: `reply`, `updated_shirp`, `updated_shirp_details`, `is_complete`
  - finalize 応答: `reply`, `updated_shirp`, `updated_shirp_details`, `feedback`, `is_complete`
- `updated_shirp` の許可キーは `S`, `H`, `I`, `R`, `P`, `#` のみとし、ランタイム検証でも同じ制約をかける。
- `updated_shirp_details` は `S`, `H`, `I`, `R` の詳細オブジェクトのみを許可し、各カテゴリ object は `strict: true` の schema 制約に合わせて全詳細キーを `required` に含めた上で値は `string | null` とする。未更新項目は `null` を返させる。
- Structured Outputs を使っていても `reply` に内部 JSON 断片が混ざる可能性はゼロではないため、`updated_shirp` / `is_complete` / `feedback` などの内部キーが混ざる応答は不正として破棄する。
- 不正応答や refusal 時は assistant メッセージを追加せず、TTS にも流さない。
- OpenAI API の失敗時は `error.message` を優先して表示し、400系エラーの原因が追えるようにする。

### 3.3 音声合成実装メモ
- OpenAI TTS 実装・更新時は、公式ドキュメントのローカルコピー `openai-tts-1.md` を参照する。
- Gemini TTS 実装・更新時は、公式ドキュメントのローカルコピー `gemini-2.5-flash-preview-tts.md` を参照する。
- OpenAI の公式ドキュメント上、ユーザーには「再生される音声が AI 生成音声であること」を明示する必要がある。
- OpenAI の現行公式ドキュメントでは `gpt-4o-mini-tts` が推奨されているが、本プロジェクト内の既存実装・表記が `tts-1` の場合は互換性とUI要件を確認した上で切り替える。
- Gemini TTS は `src/components/MeetingRoom.tsx` の `playWithGeminiTts` から `gemini-2.5-flash-preview-tts:generateContent` を呼び出している。
- Gemini TTS の話速は現時点で API パラメータ直接指定ではなく、プロンプト文字列で制御している。速度・抑揚・トーン調整時は `GEMINI_TTS_PROMPT_PREFIX` を見直す。
- 音声再生時の `audio.playbackRate` はTTS種別で分けており、OpenAI `tts-1` は `1.2`、Gemini `gemini-2.5-flash-preview-tts` は `1.0` とする。
- Gemini TTS の `voiceName` は、表示中の3Dモデルに連動して切り替える。
  - `sample.vrm` -> `Kore`
  - `trial_2.vrm` -> `Zephyr`
  - `young_counsil.vrm` -> `Zephyr`
- Gemini TTS の音声モデル切り替えや voice の追加時は、3Dモデル切り替えロジックと対応表を同時に更新する。

### 3.4 VRMモデル運用メモ
- 面談画面の3Dモデル表示は `src/components/VrmStage.tsx` で管理する。
- 現在の切り替え対象は `sample.vrm`、`trial_2.vrm`、`young_counsil.vrm` の3体とする。
- `sample.vrm` は基準モデルとして扱い、姿勢・カメラ・表情挙動を原則変更しない。
- `trial_2.vrm` は、初期姿勢については `sample.vrm` と同水準の正面待機ポーズに戻した上で運用する。
- `trial_2.vrm` のカメラ位置は、`sample.vrm` を基準にしつつも見え方に応じて手動微調整する前提とする。
- `trial_2.vrm` の表情運用は `sample.vrm` と分離して扱う。
  - lip sync は `surprised` ではなく `aa` を使用する
  - lip sync weight は強めに補正して運用する
  - デフォルト表情として `happy 0.3` を適用する
- `young_counsil.vrm` は `trial_2.vrm` と同系統の voice / lip sync / 初期表情設定で運用する。
  - モデルの改良版へ差し替える場合も、原則として `youngCounsil` の model id と `public/models/young_counsil.vrm` / `docs/models/young_counsil.vrm` の参照名は維持したまま中身を置き換える
  - voice は `Zephyr` を使う
  - lip sync は `aa` を使用し、weight も `trial_2.vrm` と同水準で補正する
  - デフォルト表情として `happy 0.3` を適用する
  - 初期カメラは上半身の収まりに合わせて個別に手動調整する
  - `blink` / `relaxed` はモデルが持つネイティブ expression を優先する
- VRM表情バインドが不足するモデルに備えて、`VrmStage.tsx` では以下のフォールバックを持つ。
  - `neck` がない場合は `head` をモーション用ボーンとして使う
  - `blink` 系が不足する場合は `Eye_Blink_L` / `Eye_Blink_R` を直接 morph target 駆動する
  - 口形状が不足する場合は `V_Open` を直接 morph target 駆動する
- `sample.vrm` は `surprised` ベースの口パクを維持し、`trial_2.vrm` / `young_counsil.vrm` 向けの表情調整が `sample.vrm` に波及しないようモデル別設定で分離する。
- 大容量VRMファイルのうちローカル配置用の `public/models` は `.gitignore` 管理とする。
- GitHub Pages は `docs` 配下を配信するため、公開に必要な `docs/models` の VRM は ignore せずデプロイ対象として扱う。

## 4. キャリアカルテ（電子カルテ）仕様
カルテは以下の3段構成でUI表示し、PDF/CSV出力に対応する。

1. プロフィール（個人情報）
- 氏名、年齢、所属企業、職種
- 勤務地(都道府県)
- 転職歴(回数)
- 勤続年数(年)
- 性別
- 現在の婚姻関係(独身 or 既婚)
- 子供の有無(人)
- 末子の年齢(歳)
- 表示UIは「基本情報」と「個人情報詳細」を切り替えられるタブ方式とする。
- 入力UIは `src/pages/DemographicsSetup.tsx` で管理するが、ユーザー向け表示名称は「プロフィール」で統一する。
- 年齢、転職歴、勤続年数、子供人数、末子年齢は `type="number"` ベースで入力させる。
- 性別は `男 / 女 / その他` の選択式とする。
- 婚姻関係は `独身 / 既婚 / その他` の選択式とする。
- 子供人数が `0` または未入力のとき、末子年齢は入力不可にし、保存値も `null` に正規化する。

2. 電子カルテ（SHIRP形式）
    *   トップレベルには従来どおり `S / H / I / R / P / #` の要約文を保持する。
    *   `shirpDetails` は `S / H / I / R / P` を持つ3層構造とし、二段目は `{ summary, items }`、三段目は二段目を構成する具体項目群とする。
    *   三段目は補助的な要素抽出欄であり、空欄を許容する。初回面談の完了条件は二段目 `summary` のみを対象にする。
    *   トップレベル `#` は詳細オブジェクトを持たず、文字列のまま扱う。
    *   **S (Satisfaction/現状)**
        *   外的条件: 収入 / 労働時間 / 勤務形態 / 作業環境 / 雇用の安定性
        *   仕事内容: 仕事内容そのもの / 達成感 / 能力発揮 / 成長実感 / 自律性 / 多様性
        *   人間関係・組織適応: 上司との関係 / 同僚との関係 / 組織文化への適応 / 心理的安全性 / 相談可能性
        *   自己評価・自己納得: 自身への評価 / 適性の実感 / 興味との一致 / 道義的納得感
    *   **H (Hope/希望)**
        *   処遇面の希望: 収入 / 安定性 / 昇進・役割
        *   仕事面の希望: 仕事内容 / 専門性 / 管理職志向 / 専門職志向 / 創造性 / 研究性 / 対人性 / 奉仕性・社会的意義
        *   働き方の希望: 勤務形態 / 労働時間 / 勤務地 / 柔軟性
        *   自己実現面の希望: 能力発揮 / 達成感 / 自律性 / 性格・興味との一致 / 道義的納得感 / 社会的評価
    *   **I (Issue/課題)**
        *   能力・経験上の課題: スキル不足 / 資格不足 / 実務経験不足 / 情報不足
        *   健康・生活上の制約: 健康 / 体力 / 家庭 / 介護・育児 / 時間不足 / 資金不足
        *   心理的課題: 自信不足 / 不安 / 迷い / 自己評価の低さ
        *   組織・環境上の制約: 組織制度 / 機会の少なさ / 年齢・ライフステージ / 周囲の理解不足
    *   **R (Resource/資源)**
        *   能力資源: 資格 / スキル / 経験 / 実績
        *   対人資源: 協力者 / 上司 / 同僚 / 家族 / メンター・相談相手
        *   心理資源: 自己効力感 / 学習意欲 / 継続力 / 自己理解 / 回復力
        *   環境資源: 使える時間 / 使える資金 / 学習機会 / 社内制度 / 社外ネットワーク
        *   適合資源: 性格との適合 / 興味との適合 / 価値観との一致 / 道義的納得感
    *   **P (Plan/計画)**
        *   探索行動: 情報収集 / 自己分析 / 相談
        *   学習行動: 学習 / 資格取得準備 / 書類作成 / 実績整理
        *   実行行動: 異動希望提出 / 面談設定 / ネットワーク形成
        *   実行管理: 期限 / 優先順位 / 相談先 / 成果確認方法
    *   **# (その他)**
        *   S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄。
    *   表示UIは、最初にトップレベル `#SHIRP` の要約を見せ、`S / H / I / R / P` は折りたたみを開くと二段目 `summary` と三段目 `items` が確認できる構成とする。
    *   UserHome / ConsultantHome のカルテ編集UIでは、トップレベル要約に加えて `S / H / I / R / P` の二段目・三段目も編集可能とする。
    *   CSV 出力は一般的な `section,item,value` の3列構成で、UTF-8 BOM 付きとする。
    *   PDF 出力は A4縦の一般的な帳票形式とし、少なくとも「基本情報」「電子カルテ要約」「電子カルテ詳細」「面談フィードバック」「アンケート」「面談前コンディション」を含める。
    *   CSV / PDF の出力対象は最新カルテ1件とし、保存済み会話ログは含めない。

3. 保存済み会話ログ
- カルテ保存時点の `messages` 配列をそのまま `conversationLog` として履歴に保存する。
- 保存単位は「カルテ保存時スナップショットごと」とする。
- UserHome のカルテ確認モーダルから、別モーダルで raw transcript を閲覧できるようにする。

4. ユーザーアンケート結果
- 初期版では準備中扱いとし、UserHome 上のボタンは disabled 表示にする。正式有効化までは一般ユーザーが回答開始できない状態を維持する。
- 25問（5点満点）から5因子（成長志向、課題解決志向、組織貢献志向、対人適応志向、情動反応傾向）を算出し、レーダーチャートで表示。
- 正式アルゴリズム受領まで、フロント側で差し替えやすいダミー算出ロジックを使用。
- PDF 出力時は、アンケート回答済みであれば因子スコア表に加えてレーダーチャート図も同梱する。
- レーダーチャート描画は UI と出力で形状がずれないよう、点計算ロジックを共通化して扱う。

5. 面談時コンディション
- 初期版では準備中扱いとし、UserHome 上のチェック開始ボタンと AuthNavigation の導線は出さない、または disabled にする。企業管理者・管理者向けの設定や集計表示は将来接続用として維持する。
- 現時点では顔分析アプリ本体は未統合とし、`/user/condition-check` でダミーの緊張度スコアを保存する。
- 保存データは `conditionRecords` に履歴として保持し、最新値を `latestKarte.conditionSummary` に反映する。
- `conditionSummary` は `score`, `level`, `measuredAt`, `source: 'demo'`, `consentVersion` を持つ。
- 生の顔画像・動画は保存しない。
- 表示は企業別 `featureFlags.stressAnalysisEnabled` が true の場合だけ行う。
- 表示対象は `UserHome`、`MeetingRoom`、`KartePanel` の主要3画面。
- ユーザー向け説明では「表情から面談前後の緊張傾向を参考値として表示するもので、医療・心理診断ではない」ことを明示する。

## 5. AI応答・対話ガイドライン（チャットAIルール）
AIのシステムプロンプトおよび面談制御で、以下を厳密適用する。

### 5.1 基本トーンとスタンス
- トーン: 「安心感」「共感」「フラット」を維持。
- 免責事項: 会話は事前準備であり、実際の面談が本番である旨を明示。

### 5.2 禁止事項（ガードレール）
- 転職の推奨（直接促す発言）
- 法律・医療の断定（専門判断の断定提示）
- 会社批判への誘導（煽り・過度な同調）

## 6. 現在実装している対話プロンプト（具体）
以下は `src/components/MeetingRoom.tsx` で運用中のシステムプロンプト要件。

### 6.1 SHIRPガイド（実文字列）

```ts
const SHIRP_GUIDE = `
S (Satisfaction/現状):
- 外的条件: 収入 / 労働時間 / 勤務形態 / 作業環境 / 雇用の安定性
- 仕事内容: 仕事内容そのもの / 達成感 / 能力発揮 / 成長実感 / 自律性 / 多様性
- 人間関係・組織適応: 上司との関係 / 同僚との関係 / 組織文化への適応 / 心理的安全性 / 相談可能性
- 自己評価・自己納得: 自身への評価 / 適性の実感 / 興味との一致 / 道義的納得感
H (Hope/希望):
- 処遇面の希望: 収入 / 安定性 / 昇進・役割
- 仕事面の希望: 仕事内容 / 専門性 / 管理職志向 / 専門職志向 / 創造性 / 研究性 / 対人性 / 奉仕性・社会的意義
- 働き方の希望: 勤務形態 / 労働時間 / 勤務地 / 柔軟性
- 自己実現面の希望: 能力発揮 / 達成感 / 自律性 / 性格・興味との一致 / 道義的納得感 / 社会的評価
I (Issue/課題):
- 能力・経験上の課題: スキル不足 / 資格不足 / 実務経験不足 / 情報不足
- 健康・生活上の制約: 健康 / 体力 / 家庭 / 介護・育児 / 時間不足 / 資金不足
- 心理的課題: 自信不足 / 不安 / 迷い / 自己評価の低さ
- 組織・環境上の制約: 組織制度 / 機会の少なさ / 年齢・ライフステージ / 周囲の理解不足
R (Resource/資源):
- 能力資源: 資格 / スキル / 経験 / 実績
- 対人資源: 協力者 / 上司 / 同僚 / 家族 / メンター・相談相手
- 心理資源: 自己効力感 / 学習意欲 / 継続力 / 自己理解 / 回復力
- 環境資源: 使える時間 / 使える資金 / 学習機会 / 社内制度 / 社外ネットワーク
- 適合資源: 性格との適合 / 興味との適合 / 価値観との一致 / 道義的納得感
P (Plan/計画):
- 探索行動: 情報収集 / 自己分析 / 相談
- 学習行動: 学習 / 資格取得準備 / 書類作成 / 実績整理
- 実行行動: 異動希望提出 / 面談設定 / ネットワーク形成
- 実行管理: 期限 / 優先順位 / 相談先 / 成果確認方法
# (その他):
- S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄。
`;
```

### 6.2 共通ガイドライン差し込み（実文字列）

```ts
const AI_RESPONSE_GUIDELINES = `
# AI応答ガイドライン
- トーンは「安心感」「共感」「フラット」を徹底してください。
- この会話は事前準備であり、実際の面談が本番であることを必ず明示してください。
- 次の禁止事項を厳守してください:
  1) 転職を直接推奨しない
  2) 法律・医療の断定をしない
  3) 会社批判への誘導をしない
`;
```

### 6.3 初回面談プロンプト（buildInitialPrompt 実文字列）

```ts
const buildInitialPrompt = (karte: KarteData, nextStep: InitialDetailStep | null) => {
  const currentCategory = nextStep?.category ?? 'S';
  const currentField = nextStep?.field;
  const followingStep = getFollowingInitialDetailStep(nextStep);
  const currentStepLabel = currentField
    ? getInitialDetailStepLabel(currentCategory, currentField)
    : 'P. 計画生成と全体整理';
  const currentPromptHint = currentField
    ? (SHIRP_DETAIL_PROMPT_HINTS[currentCategory] as Record<string, string>)[currentField]
    : '全体要約と計画生成';
  const followingStepLabel =
    followingStep ? getInitialDetailStepLabel(followingStep.category, followingStep.field) : 'P. 計画生成と全体整理';
  return `
あなたは経験豊富なキャリアメンターです。初回面談ではSHIRP形式のうち、S→H→I→Rの順で詳細項目を1つずつ埋めます。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

# 今回フォーカスする詳細項目
- 項目: ${currentStepLabel}
- 確認したい内容: ${currentPromptHint}

# この項目が十分に埋まった場合に次に聞く候補
- ${followingStepLabel}

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーの発話から情報を抽出し、updated_shirp でトップレベル要約を、updated_shirp_details で二段目要約と分かる範囲の三段目項目を更新してください。
2. 以前のテンポの良い面談のように、reply は「短い受け止め + すぐ次の1問」で構成してください。冗長なまとめ、前置き、励まし、次回予告は不要です。
3. 今回の「${currentStepLabel}」が今回の発話で十分に埋まる場合は、reply の最後で次の候補「${followingStepLabel}」について自然に1問だけ聞いてください。
4. 今回の「${currentStepLabel}」がまだ不十分な場合だけ、同じ項目を追加で1問深掘りしてください。
5. is_complete は、必須詳細項目17件の二段目要約がすべて埋まり、P(計画)を生成した時だけ true にしてください。それまでは false にしてください。
6. 必須詳細項目がすべて埋まった場合は、P(計画)のトップレベル要約と詳細計画を生成し、面談のまとめを返してください。
7. 6の完了時は、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して初回面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を reply に含めてください。
8. トップレベルの S/H/I/R は、詳細項目を踏まえた短い要約文にしてください。
9. 三段目項目は会話から自然に読み取れるものだけ埋め、判断できないものは null のままにしてください。S〜Pに当てはまらない内容は#に記録してください。
10. reply は原則2文以内、かつ最後は必ず1つの質問文で終えてください。完了時の保存案内だけはこの制約の例外です。
11. 「次回の面談で」「後ほど」「この調子で」「引き続きよろしくお願いします」など、流れを止める定型文は使わないでください。
12. response_format の JSON Schema に厳密に従って出力してください。reply にはユーザーに見せる自然な返答だけを書いてください。
13. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
14. デモグラフィックは既知情報として理解しつつ、断定や過剰な言及は避けてください。既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
`.trim();
};
```

### 6.4 継続面談プロンプト（buildContinuousPrompt 実文字列）

```ts
const buildContinuousPrompt = (karte: KarteData) => `
あなたはキャリアメンターとして自由対話モードでユーザーに寄り添います。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーが自由に話せるように傾聴し、深掘り質問やプロービングを行います。
2. ユーザーの発話から得た情報で、トップレベル要約と必要な詳細項目の両方を部分更新してください。
3. response_format の JSON Schema に厳密に従って出力してください。
4. reply にはユーザーに見せる自然な返答だけを書いてください。
5. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
6. デモグラフィックは既知情報として扱いますが、返答トーンは現状の自然さを維持してください。
7. 既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
`.trim();
```

### 6.5 継続面談の最終整理プロンプト（buildContinuousFinalizePrompt 実文字列）

```ts
const buildContinuousFinalizePrompt = (karte: KarteData) => `
あなたは自由対話の内容を整理し、SHIRPカルテを更新して簡単なフィードバックを提示します。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. 会話履歴から情報を抽出し、SHIRPのトップレベル要約と二段目要約・三段目項目を可能な限り埋めてください。
2. 足りない項目は補足し、P(計画)のトップレベル要約と詳細計画を生成してください。
3. 面談後のキャリアに関する簡単なフィードバックを80~120文字で作成してください。
4. reply の最後に、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を含めてください。
5. response_format の JSON Schema に厳密に従って出力してください。
6. reply にはユーザーに見せる自然な返答だけを書いてください。
7. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
8. デモグラフィックは整合性確認のために使い、返答のトーンや構成は大きく変えないでください。
9. 既知のプロフィール情報と矛盾しない前提で整理し、不足分は会話履歴ベースで補ってください。
`.trim();
```

### 6.6 現在の入力ショートカット
- テキスト送信は `Shift + Enter` に加えて、`Cmd + Enter` と `Ctrl + Enter` でも送信可能。
- 通常の Enter 単独では送信しない。

## 7. 管理・バックエンド仕様と将来展望
- 利用回数管理UI: Admin画面で「初回面談」「継続面談」を別列で表示し、デモユーザーについては「上限 / 使用済み / 残り」が分かるようにする。CompanyAdminHomeでは企業単位の残り使用回数を表示する。UserHomeでは利用回数・残り回数を表示しない。
- 会話ターン制限UI: Admin画面とCompanyAdminHomeでは、表記を「初回面談1回あたりのAI使用可能回数」「継続面談1回あたりのAI使用可能回数」とし、`MeetingRoom` の送信可能回数と連動させる。UserHomeではAI利用可能回数を表示しない。
- デモ版クォータ管理: 現時点ではDBを使わず、`src/lib/demoUsageQuota.ts` のメモリ状態を正とする。Admin画面とCompanyAdminHomeから更新でき、UserHomeとMeetingRoomへ同一SPAセッション内で同期する。ページリフレッシュ時はデフォルト値（初回上限10回、継続上限4回、初回AI10回、継続AI7回）へ戻る。
- 面談回数消費: 実際に面談画面で最初のテキスト送信または音声送信を行った時点で、該当面談種別の使用済み回数を1増やす。誤クリックや面談画面を開いただけでは消費しない。同一面談セッション内で2通目以降を送っても追加消費しない。
- 残数0回時のブロック: 残り0回の場合は、UserHomeの開始操作とMeetingRoom直アクセスの両方で開始不可とし、必ず原因が分かる toast を表示する。
- テナント管理: デモ版では企業を `tenants` として扱い、現在ユーザーは `tenantId` で所属企業に紐づく。既存データに `tenantId` がない場合はデフォルトテナントへ正規化する。
- 企業別機能フラグ: `featureFlags` で `stressAnalysisEnabled`, `turnTakingEnabled`, `lightThemeEnabled` を保持する。現時点でUI切替対象は `stressAnalysisEnabled`。
- 管理者画面: `/admin` では企業別オプション管理から、各テナントの `stressAnalysisEnabled` を切り替えられる。
- 企業管理者画面: `/company-admin` では自社テナントの `stressAnalysisEnabled` と、面談利用回数・会話ターン制限を切り替え・設定できる。加えて、自社テナントの従業員カルテを検索・並び替え・一括選択し、個別/一括PDF出力と個別/一括印刷を行える。個人別の顔分析・緊張度詳細は表示せず、測定件数などの集計値に留める。
- 企業管理者用従業員データ: デモ版では `companyEmployees` に保存し、`getCompanyAdminEmployees(state, tenantId)` で現在テナントの従業員のみ取得する。現在のデモユーザー `DEFAULT_DEMO_USER_ID` は `latestKarte` / `karteRecords` から動的に従業員一覧へ反映し、重複保存しない。
- カルテ出力: 一般ユーザーのCSV/PDFは最新カルテ1件を対象とする。企業管理者画面では選択した従業員カルテを1つの結合PDFとして一括出力でき、印刷時も選択カルテを印刷用ページにまとめる。カルテ未作成ユーザーは出力対象からスキップし、toastで件数を通知する。
- ログイン認証: SSOは見送り、アカウントIDとパスワードによる標準ログインへ移行する方針。現時点では `/login` と `/admin/login` のダミー認証を使い、任意のID/パスワードで認証を通す。デモ版の再設定・一時パスワード発行は画面確認用で、VPS/本番ではDB・サーバー側セッション・ロール/テナント制御・パスワード検証に置き換える。
- コンサルタント向けシミュレータ: 一般ユーザー向け機能の後続で追加開発予定。
