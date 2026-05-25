# Phase 4: ビルドと内部テスト手順

ローカル準備が完了したらこのドキュメントに沿って実機テストまで進める。

---

## 0. 前提条件チェック

実施前に以下を確認:

- `npm run typecheck` がエラー 0
- `npm run typecheck:functions` がエラー 0
- `.env` が Firebase 6 変数で埋まっている
- `npx firebase-tools login` 済み（`firebase projects:list` で表示できる）
- `npx eas-cli login` 済み（`eas whoami` で表示できる）
- Firebase プロジェクト ID: `brain-detox-bea63`
- EAS プロジェクト ID: `26ef59bf-2523-4532-be9c-bc686c4382d2`

---

## 1. バックエンドのデプロイ (ビルド前に必須)

クライアントから呼ばれる `openaiProxy` 関数と Firestore Rules を本番に反映する。

```powershell
# Functions デプロイ (gpt-4o-mini / Tokyo region / レート制限 50/日)
npm run functions:deploy

# Firestore Rules デプロイ (CI もあるが手動でも可)
npm run rules:deploy
```

OPENAI_API_KEY Secret は既に設定済み。ローテーションする場合のみ:

```powershell
npx firebase-tools functions:secrets:set OPENAI_API_KEY
npm run functions:deploy
```

---

## 2. EAS Secrets 一括登録

`.env` の Firebase 6 変数を EAS Secrets (project scope) に登録。

```powershell
# 初回 (新規作成のみ)
npm run secrets:register

# 既存を上書きする場合
npm run secrets:register:force
```

登録確認:

```powershell
npx eas-cli secret:list
```

期待出力 (6 件):

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

---

## 3. プレビュービルド

実機にインストールして動作確認するための internal distribution ビルド。

### iOS

```powershell
npm run build:preview:ios
```

初回のみ:

- Apple Developer Program へのログインを求められる
- 「Generate a new Apple Distribution Certificate?」→ Yes
- 「Generate a new Apple Provisioning Profile?」→ Yes
- 「Register this device?」→ Yes (Ad-hoc 配布用デバイス登録)

完了後、表示される QR コードまたは URL からデバイスにインストール。

### Android

```powershell
npm run build:preview:android
```

完了後、表示される URL から APK をダウンロードしてインストール (要: 提供元不明のアプリ許可)。

ビルド進行状況:

```powershell
npx eas-cli build:list --limit 5
```

---

## 4. 実機動作チェックリスト

ビルドが完了してインストールしたら、**両 OS で** 以下を一通り消化する。

### 起動・初期設定

- 初回起動できる (クラッシュなし)
- 言語選択画面が表示される (端末言語に応じてデフォルト選択)
- テーマ選択画面が表示される
- パートナー診断クイズが完走できる
- パートナーが決定され、ホーム画面に遷移

### コア機能

- ホーム画面でパートナーメッセージが表示される (初回 → OpenAI 呼び出し)
- アクションプラン生成 → OpenAI 呼び出し成功
- アクション完了 → スコア反映 (履歴に追加)
- ガイド付きアクション (呼吸 / タイマー) が動作する
- ブレインロットテスト完走 → スコア変動 (±30 以内にクランプされる)
- Vibe Check (Color Swerve / Synapse Match / Focus Shield) 3 フェーズ完走

### 表示・UI

- 履歴画面: カレンダー表示
- 履歴画面: グラフ表示 (フリップ切替)
- 履歴画面: 日別詳細モーダル
- スコアに応じて脳画像 (`brain_tier_01..10`) が変化
- パートナー画面: 立ち絵 (idle / speak / praise / triumph) ポーズ変化

### 設定

- 言語切替 (ja / en / th) → 全テキスト切替
- テーマ切替 → 配色変化
- パートナー変更 → 立ち絵差し替え
- 通知のスケジュール / テスト送信
- **データリセット → Firestore のデータも消える**
  - Firebase Console > Firestore Database > `users/{uid}` が消えていること確認
- アプリ情報 → プライバシーポリシー リンク (※GitHub Pages デプロイ後)
- アプリ情報 → 利用規約 リンク (※GitHub Pages デプロイ後)

### セキュリティ・レート制限

- アクションを高速で 50 回繰り返す → 51 回目で `RateLimitError` (日次)
- アクションを 1 分以内に 10 回 → 11 回目で `RateLimitError` (バースト)
- レート制限エラー時にアプリが落ちず、メッセージが表示される
- (P1-2 後) App Check enforce 後、改ざんクライアントから呼べないことを確認

### 安定性

- バックグラウンド → フォアグラウンド復帰でクラッシュなし
- 機内モードで起動 → オフラインフォールバックメッセージ表示
- 機内モード解除 → 自動で再接続
- ホームタブ ↔ 他タブを高速往復してもクラッシュ・メモリリークなし

---

## 5. 内部テスター配布 (任意)

実機テストを家族・友人 5-10 人に依頼したい場合。

### iOS (TestFlight)

```powershell
# プレビューでなくプロダクション同等の internal build
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios --latest
```

App Store Connect > TestFlight > 「内部テスト」グループを作成し、Apple ID を招待。

### Android (Play Console 内部テスト)

```powershell
npx eas-cli build --profile production --platform android
npx eas-cli submit --platform android --latest
```

Play Console > テスト > 内部テスト > メーリングリストに Gmail を追加。

---

## 6. 完了基準

Phase 4 は以下を全て満たした時点で完了:

- バックエンド (Functions + Rules) がデプロイ済み
- EAS Secrets が 6 件登録済み
- iOS / Android 両方のプレビュービルドが成功
- 上記「実機動作チェックリスト」を両 OS で完走
- 重大なクラッシュ / データ消失 / 表示崩れがない

完了したら **Phase 5: ストアコンサブミット** へ進む。

---

## トラブルシューティング

### ビルド時 `Plugin "expo-dev-client" not found`

`app.config.js` で production プロファイル時に自動除外されているはず。`EAS_BUILD_PROFILE` 環境変数が EAS Build で `production` に設定されていることを確認。

### `eas build` が中断 (`Apple Developer Account` 関連)

初回のみ Apple ID + パスワードと、必要に応じて App-Specific Password が必要。
[https://appleid.apple.com/account/manage](https://appleid.apple.com/account/manage) で生成。

### Functions 呼び出しで `unauthenticated`

クライアントの匿名認証が完了していない。アプリ起動直後ではなく、ホーム到達後にテスト。
Firebase Console > Authentication > Users で匿名ユーザーが増えているか確認。

### Firestore Rules でアクセス拒否

Firebase Console > Firestore Database > ルールタブで現在のルールを確認し、`firestore.rules` と一致するか確認。
一致しない場合 `npm run rules:deploy` で再デプロイ。

### レート制限が想定通り発火しない

Firestore の `rateLimits/{uid}` ドキュメントを Firebase Console から確認。
`dailyCount` `minuteCount` フィールドの値を見て、リセット条件 (`dayKey` / `minuteKey` 不一致でゼロリセット) が正しいか確認。