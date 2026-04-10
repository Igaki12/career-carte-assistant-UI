# Career Karte Assistant - エージェント設計書

## 1. プロジェクトのゴールと開発方針
現在の単一機能Reactアプリを、将来的な拡張性とVPS運用を見据えた役割別SPA構成へリファクタリングし、統合的なキャリアコンサルタントシミュレータを構築する。
日本型事前問診のスロット充填（初回面談）と、海外アンビエントAIの書記体験（継続面談）を融合したUI/UXを目指し、面談フェーズごとに対話制御を最適化する。

## 2. アプリケーションアーキテクチャ（SPA構成）
### 2.1 技術スタック
- Frontend: React (Vite), Chakra UI, Three.js + @pixiv/three-vrm
- Routing: React Router DOM (v6)
- Hosting (Current): GitHub Pages (Static /docs) + HashRouter
- Hosting (Future): VPS (Ubuntu) + Node.js (Express) + Apache2 (Reverse Proxy) + DB + BrowserRouter

### 2.2 役割別ページ構成とルーティング
- Home (`/`): サービス紹介、各ロールへの遷移。デモ版では「初回面談を始める」「継続面談を始める」を横並びで表示し、別導線で「プロフィールを設定」を配置する。
- DemographicsSetup (`/user/demographics`): プロフィール初期設定・編集。未設定時の導線兼、UserHomeからの編集画面。デモ検証用に「デモ用にスキップして進む」を持つ。
- UserHome (`/user`): 一般ユーザー用。初回/継続面談スタート、継続面談モード選択、カルテ閲覧・出力、アンケート、プロフィール編集、面談前コンディションチェック導線を配置する。ステータスは summary 表示を基本とし、詳細 badge の羅列は表示しない。
- ConsultantHome (`/consultant`): コンサルタント用。担当ユーザーのカルテ閲覧・修正、AI練習面談（ロードマップ）。
- Admin (`/admin`): 管理者用。アカウント管理、利用回数（初回/継続を別カラム）設定、企業別オプション管理。
- CompanyAdminHome (`/company-admin`): 企業管理者用。自社テナントのユーザー管理デモ、緊張度スコア表示オプションのON/OFF、コンディション測定件数の集計表示。
- InitialMeetingRoom (`/app/initial`): 初回面談（順次ヒアリング型）。
- ContinuousMeetingRoom (`/app/continuous`): 継続面談（自由対話型）。
- ConditionCheck (`/user/condition-check`): 面談前コンディションチェック。現時点では顔分析ロジック未接続のため、同意文付きのダミースコア保存画面として扱う。

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
- 旧 `cca-karte` は読み込み互換のみ残す。

## 3. コア機能：AI面談フローの完全分離
初回面談と継続面談を別ページ・別ロジックとして実装する。

### 3.1 初回面談ページ（`/app/initial`）
- 目的: SHIRPベースのカルテを作成。
- 事前条件: プロフィール未設定かつ `demographicsSkipped` が false の場合は `/user/demographics?returnTo=/app/initial` へ誘導する。デモ用スキップ済みの場合は初回面談へ進める。
- 制御: S -> H -> I -> R の順にヒアリング。必要に応じて # を補記。
- 通信: MediaRecorder -> Whisper(STT) -> GPT-4o -> TTS-1。
- 事前読込: 保存済みプロフィール情報を `karte.demographics` に注入した状態で開始する。
- 途中保存: 会話履歴、カルテ、API使用回数、進行状態を `draftSessions.initial` に自動保存する。
- 再開: UserHome から初回面談開始時、下書きがあれば「続きから再開 / 新規開始」を選ばせる。
- 完了動線: 面談中にカルテ確認・保存を行い、保存後はUserHomeへ遷移。
- 表示: 企業別 `featureFlags.stressAnalysisEnabled` が true の場合、ルーム概要付近に面談前コンディション（緊張度スコア）を表示する。未測定時は「未測定」とチェック導線を表示する。

### 3.2 継続面談ページ（`/app/continuous`）
- 目的: 自由対話で既存カルテを更新し、面談後フィードバックを提示。
- カルテ処理: 初回面談で保存されたカルテを事前ロード。
- 通信方式選択（UserHome）:
  - 通常モード: Whisper + GPT-4o + TTS-1
  - ターンテイキングモード: Realtime API想定（現時点はUI表示のみ、課金表記拡張余地あり）
- 途中保存: 会話履歴、カルテ、API使用回数、進行状態を `draftSessions.continuous` に自動保存する。
- 再開: UserHome から継続面談開始時、下書きがあれば「続きから再開 / 新規開始」を選ばせる。
- 完了動線: カルテ保存後はUserHomeへ遷移。
- 表示: 企業別 `featureFlags.stressAnalysisEnabled` が true の場合、ルーム概要付近に面談前コンディション（緊張度スコア）を表示する。未測定時は「未測定」とチェック導線を表示する。

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
  - 通常応答: `reply`, `updated_shirp`, `is_complete`
  - finalize 応答: `reply`, `updated_shirp`, `feedback`, `is_complete`
- `updated_shirp` の許可キーは `S`, `H`, `I`, `R`, `P`, `#` のみとし、ランタイム検証でも同じ制約をかける。
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
    *   **S (Satisfaction/現状)**
        *   組織適応
        *   自身への評価
        *   良好な人間関係
        *   #そのほかの現状
    *   **H (Hope/希望)**
        *   希望する収入
        *   希望する仕事内容
        *   希望する勤務形態
        *   #そのほかの希望
    *   **I (Issue/課題)**
        *   スキルの課題
        *   健康上の課題
        *   年齢の課題
        *   家庭の課題
        *   #そのほかの課題
    *   **R (Resource/資源)**
        *   強みとなる資格
        *   強みとなる経験
        *   強みとなる協力者
        *   強みとなる時間や資金
        *   #そのほかの強み
    *   **P (Plan/プラン)**
        *   S〜Rの情報を元に、AIが解決に向けたプランを生成する。
    *   **# (その他)**
        *   S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄。

3. 保存済み会話ログ
- カルテ保存時点の `messages` 配列をそのまま `conversationLog` として履歴に保存する。
- 保存単位は「カルテ保存時スナップショットごと」とする。
- UserHome のカルテ確認モーダルから、別モーダルで raw transcript を閲覧できるようにする。

4. ユーザーアンケート結果
- 25問（5点満点）から5因子（成長志向、課題解決志向、組織貢献志向、対人適応志向、情動反応傾向）を算出し、レーダーチャートで表示。
- 正式アルゴリズム受領まで、フロント側で差し替えやすいダミー算出ロジックを使用。

5. 面談時コンディション
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
- 組織適応
- 自身への評価
- 良好な人間関係
- #そのほかの現状
H (Hope/希望):
- 希望する収入
- 希望する仕事内容
- 希望する勤務形態
- #そのほかの希望
I (Issue/課題):
- スキルの課題
- 健康上の課題
- 年齢の課題
- 家庭の課題
- #そのほかの課題
R (Resource/資源):
- 強みとなる資格
- 強みとなる経験
- 強みとなる協力者
- 強みとなる時間や資金
- #そのほかの強み
P (Plan/プラン):
- S〜Rの情報を元に、AIが解決に向けたプランを生成する。
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
const buildInitialPrompt = (karte: KarteData, nextKey: ShirpKey | null) => {
  const currentKey = nextKey ?? 'S';
  return `
あなたは経験豊富なキャリアメンターです。初回面談ではSHIRP形式のうち、S→H→I→Rの順で情報を埋めます。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 今回フォーカスする項目
${currentKey}

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーの発話から情報を抽出し、該当項目を更新してください。
2. 今回は「${currentKey}」の内容を深掘りする質問を1つだけ行ってください。
3. S,H,I,Rが全て埋まった場合は、P(プラン)を生成し、面談のまとめを返してください。
4. 3の完了時は、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して初回面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を reply に含めてください。
5. 余談やS〜Pに当てはまらない内容は#に記録してください。
6. response_format の JSON Schema に厳密に従って出力してください。
7. reply にはユーザーに見せる自然な返答だけを書いてください。
8. reply に JSON 断片、キー名(updated_shirp / is_complete / feedback)、補足説明は含めないでください。
9. プロフィール情報は既知情報として理解しつつ、断定や過剰な言及は避けてください。
10. 既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
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

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーが自由に話せるように傾聴し、深掘り質問やプロービングを行います。
2. ユーザーの発話から得た情報で、SHIRPを部分的に更新してください。
3. response_format の JSON Schema に厳密に従って出力してください。
4. reply にはユーザーに見せる自然な返答だけを書いてください。
5. reply に JSON 断片、キー名(updated_shirp / is_complete / feedback)、補足説明は含めないでください。
6. プロフィール情報は既知情報として扱いますが、返答トーンは現状の自然さを維持してください。
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

${AI_RESPONSE_GUIDELINES}

# 指示
1. 会話履歴から情報を抽出し、SHIRP項目を可能な限り埋めてください。
2. 足りない項目は補足し、P(プラン)を生成してください。
3. 面談後のキャリアに関する簡単なフィードバックを80~120文字で作成してください。
4. reply の最後に、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を含めてください。
5. response_format の JSON Schema に厳密に従って出力してください。
6. reply にはユーザーに見せる自然な返答だけを書いてください。
7. reply に JSON 断片、キー名(updated_shirp / is_complete / feedback)、補足説明は含めないでください。
8. プロフィール情報は整合性確認のために使い、返答のトーンや構成は大きく変えないでください。
9. 既知のプロフィール情報と矛盾しない前提で整理し、不足分は会話履歴ベースで補ってください。
`.trim();
```

### 6.6 現在の入力ショートカット
- テキスト送信は `Shift + Enter` に加えて、`Cmd + Enter` と `Ctrl + Enter` でも送信可能。
- 通常の Enter 単独では送信しない。

## 7. 管理・バックエンド仕様と将来展望
- 利用回数管理UI: Admin画面で「初回面談残り回数」「継続面談残り回数」を別列で表示・編集。
- テナント管理: デモ版では企業を `tenants` として扱い、現在ユーザーは `tenantId` で所属企業に紐づく。既存データに `tenantId` がない場合はデフォルトテナントへ正規化する。
- 企業別機能フラグ: `featureFlags` で `stressAnalysisEnabled`, `turnTakingEnabled`, `lightThemeEnabled` を保持する。現時点でUI切替対象は `stressAnalysisEnabled`。
- 管理者画面: `/admin` では企業別オプション管理から、各テナントの `stressAnalysisEnabled` を切り替えられる。
- 企業管理者画面: `/company-admin` では自社テナントの `stressAnalysisEnabled` を切り替えられる。個人別の顔分析・緊張度詳細は表示せず、測定件数などの集計値に留める。
- SSO・ディープリンク: VPS環境下で `/#/user/:userId?token=...` によるSSOログインを実装予定。
- コンサルタント向けシミュレータ: 一般ユーザー向け機能の後続で追加開発予定。
