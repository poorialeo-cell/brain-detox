# brain-detox

ショート動画依存（ブレインロット）からの回復をサポートする React Native (Expo) アプリ。
4タイプのAIパートナーが、ユーザーのブレインスコアと行動履歴に応じたアクションを提案します。

- **対応プラットフォーム**: iOS / Android（Expo SDK 54 / RN 0.81）
- **多言語**: 日本語 / English / ภาษาไทย
- **AIパートナー**: 教師 / カウンセラー / 科学者 / トレーナー の4タイプ

---

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env` を作成し、Firebase Console から取得した値を入れてください。

```bash
cp .env.example .env
```

`.env` に設定する6変数:

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

OpenAI API キーは**サーバー側**（Firebase Functions の Secret Manager）で管理します。
クライアントには絶対に設定しないでください。

### 3. 開発サーバー起動

```bash
npx expo start
```

iOS シミュレータは `i`、Android エミュレータは `a` で起動。Expo Go では `expo-dev-client` 対応のため、開発ビルドが必要です（後述の EAS ビルド参照）。

---

## アーキテクチャ

```
┌─ Expo Client (React Native) ──────────────────────────┐
│  • UI / Navigation / Animations                       │
│  • Zustand store + AsyncStorage persist               │
│  • Firebase Auth (匿名) / Firestore (履歴・プロフィール) │
│  └─ httpsCallable('openaiProxy') ─────────────────┐   │
└─────────────────────────────────────────────────────┼──┘
                                                     │
┌─ Firebase Functions (asia-northeast1) ──────────────▼──┐
│  openaiProxy                                            │
│  • request.auth で Firebase 認証検証                    │
│  • Secret Manager から OpenAI API キーを取得            │
│  • OpenAI Chat Completions を呼び出し                   │
└──────────────────────────────────────────────────────────┘
```

### 主要ディレクトリ

```
src/
├─ components/      UI コンポーネント
├─ screens/         画面（Home/Action/History/Settings/...）
├─ navigation/      React Navigation 設定
├─ services/        Firebase / OpenAI / 通知 / スコアリング
├─ store/           Zustand store
├─ hooks/           カスタムフック（i18n, haptics 等）
├─ locales/         ja/en/th JSON
├─ types/           TypeScript 型定義
├─ config/          パートナー設定・スコア設定
└─ utils/           純粋関数（カレンダー、ティア計算 等）

functions/          Firebase Functions (openaiProxy)
firestore.rules     Firestore セキュリティルール
```

---

## Firebase Functions デプロイ

### 初回セットアップ

```bash
cd functions
npm install
cd ..
npx firebase-tools login
```

### OpenAI API キーの登録（Secret Manager）

```bash
npx firebase-tools functions:secrets:set OPENAI_API_KEY
```

**注意**: プロンプトに API キーを貼り付けるとき、**末尾改行に注意**してください。`Bearer ...\n is not a legal HTTP header value` エラーの原因になります。

### デプロイ

```bash
npx firebase-tools deploy --only functions --project <PROJECT_ID>
```

### Cloud Run IAM 設定（初回のみ）

Cloud Run コンソールから `openaiproxy` サービスの権限に `allUsers` を **Cloud Run Invoker** として追加してください。
詳細: [Cloud Run permissions](https://console.cloud.google.com/run)

---

## Firestore Rules デプロイ

`firestore.rules` をリポジトリで管理し、`main` ブランチへの push で GitHub Actions が自動デプロイします（`.github/workflows/deploy-firestore-rules.yml`）。

手動デプロイ:

```bash
npx firebase-tools deploy --only firestore:rules --project <PROJECT_ID>
```

---

## EAS ビルド

### 環境変数（必須）

EAS Build では `.env` は自動伝播しません。**EAS Secrets** に上記6変数を登録し、`eas.json` の production プロファイルに `env` ブロックで参照を追加してください。

```bash
# EAS Secrets に登録
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value <value>
# ... 6変数全てに対して実施
```

### 本番ビルド

```bash
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```

---

## セキュリティ


| 項目                                          | 状態                     |
| ------------------------------------------- | ---------------------- |
| Firestore Rules: 自分のドキュメントのみ読み書き            | ✅                      |
| Firestore Rules: scoreHistory は append-only | ✅                      |
| Firestore Rules: testDelta は ±30 にクランプ      | ✅                      |
| OpenAI API キーはサーバー側 Secret Manager のみ       | ✅                      |
| Firebase 匿名認証 + AsyncStorage で永続化           | ✅                      |
| Firebase App Check（モニタリングモード）               | ⚠️ リリース後に enforce 化を推奨 |
| OpenAI プロキシのレート制限                           | ⚠️ 未実装（将来課題）           |


---

## トラブルシューティング

### 「オフラインモード」になる

1. `.env` の Firebase 6変数が正しく入っているか確認
2. Firebase Console で Authentication > Sign-in method > 匿名 が有効か確認
3. Cloud Run の `openaiproxy` サービスに `allUsers` Invoker 権限があるか確認
4. Firebase Functions ログを確認: `npx firebase-tools functions:log --only openaiProxy`

### 通知が来ない

- iOS: 実機ビルドが必要（Expo Go では制限あり）
- 設定アプリから通知許可を確認

---

## ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) を参照。