# Phase 4: ビルドと冁E��チE��ト手頁E
ローカル準備が完亁E��たらこ�Eドキュメントに沿って実機テストまで進める、E
---

## 0. 前提条件チェチE��

実施前に以下を確誁E

- `npm run typecheck` がエラー 0
- `npm run typecheck:functions` がエラー 0
- `.env` ぁEFirebase 6 変数で埋まってぁE��
- `npx firebase-tools login` 済み�E�Efirebase projects:list` で表示できる�E�E- `npx eas-cli login` 済み�E�Eeas whoami` で表示できる�E�E- Firebase プロジェクチEID: `brain-detox-bea63`
- EAS プロジェクチEID: `26ef59bf-2523-4532-be9c-bc686c4382d2`

---

## 1. バックエンド�EチE�Eロイ (ビルド前に忁E��E

クライアントから呼ばれる `openaiProxy` 関数と Firestore Rules を本番に反映する、E
```powershell
# Functions チE�Eロイ (gpt-4o-mini / Tokyo region / レート制陁E50/日)
npm run functions:deploy

# Firestore Rules チE�Eロイ (CI もあるが手動でも可)
npm run rules:deploy
```

OPENAI_API_KEY Secret は既に設定済み。ローチE�Eションする場合�Eみ:

```powershell
npx firebase-tools functions:secrets:set OPENAI_API_KEY
npm run functions:deploy
```

---

## 2. EAS Secrets 一括登録

`.env` の Firebase 6 変数めEEAS Secrets (project scope) に登録、E
```powershell
# 初回 (新規作�Eのみ)
npm run secrets:register

# 既存を上書きする場吁Enpm run secrets:register:force
```

登録確誁E

```powershell
npx eas-cli secret:list
```

期征E�E劁E(6 件):

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

---

## 3. プレビュービルチE
実機にインスト�Eルして動作確認するため�E internal distribution ビルド、E
### iOS

```powershell
npm run build:preview:ios
```

初回のみ:

- Apple Developer Program へのログインを求められめE- 「Generate a new Apple Distribution Certificate?」�E Yes
- 「Generate a new Apple Provisioning Profile?」�E Yes
- 「Register this device?」�E Yes (Ad-hoc 配币E��チE��イス登録)

完亁E��、表示されめEQR コードまた�E URL からチE��イスにインスト�Eル、E
### Android

```powershell
npm run build:preview:android
```

完亁E��、表示されめEURL から APK をダウンロードしてインスト�Eル (要E 提供�E不�Eのアプリ許可)、E
ビルド進行状況E

```powershell
npx eas-cli build:list --limit 5
```

---

## 4. 実機動作チェチE��リスチE
ビルドが完亁E��てインスト�Eルしたら、E*両 OS で** 以下を一通り消化する、E
### 起動�E初期設宁E
- 初回起動できる (クラチE��ュなぁE
- 言語選択画面が表示されめE(端末言語に応じてチE��ォルト選抁E
- チE�Eマ選択画面が表示されめE- パ�Eトナー診断クイズが完走できる
- パ�Eトナーが決定され、�Eーム画面に遷移

### コア機�E

- ホ�Eム画面でパ�EトナーメチE��ージが表示されめE(初回 ↁEOpenAI 呼び出ぁE
- アクションプラン生�E ↁEOpenAI 呼び出し�E劁E- アクション完亁EↁEスコア反映 (履歴に追加)
- ガイド付きアクション (呼吸 / タイマ�E) が動作すめE- ブレインロチE��チE��ト完走 ↁEスコア変動 (±30 以冁E��クランプされる)
- Vibe Check (Color Swerve / Synapse Match / Focus Shield) 3 フェーズ完走

### 表示・UI

- 履歴画面: カレンダー表示
- 履歴画面: グラフ表示 (フリチE�E刁E��)
- 履歴画面: 日別詳細モーダル
- スコアに応じて脳画僁E(`brain_tier_01..10`) が変化
- パ�Eトナー画面: 立ち絵 (idle / speak / praise / triumph) ポ�Eズ変化

### 設宁E
- 言語�E替 (ja / en / th) ↁE全チE��スト�E替
- チE�Eマ�E替 ↁE配色変化
- パ�Eトナー変更 ↁE立ち絵差し替ぁE- 通知のスケジュール / チE��ト送信
- **チE�EタリセチE�� ↁEFirestore のチE�Eタも消えめE*
  - Firebase Console > Firestore Database > `users/{uid}` が消えてぁE��こと確誁E- アプリ惁E�� ↁEプライバシーポリシー リンク (※GitHub Pages チE�Eロイ征E
- アプリ惁E�� ↁE利用規紁Eリンク (※GitHub Pages チE�Eロイ征E

### セキュリチE��・レート制陁E
- アクションを高速で 50 回繰り返す ↁE51 回目で `RateLimitError` (日次)
- アクションめE1 刁E��冁E�� 10 囁EↁE11 回目で `RateLimitError` (バ�EスチE
- レート制限エラー時にアプリが落ちず、メチE��ージが表示されめE- (P1-2 征E App Check enforce 後、改ざんクライアントから呼べなぁE��とを確誁E
### 安定性

- バックグラウンチEↁEフォアグラウンド復帰でクラチE��ュなぁE- 機�Eモードで起勁EↁEオフラインフォールバックメチE��ージ表示
- 機�Eモード解除 ↁE自動で再接綁E- ホ�EムタチEↁE他タブを高速往復してもクラチE��ュ・メモリリークなぁE
---

## 5.  (任愁E

実機テストを家族�E友人 5-10 人に依頼したぁE��合、E
### iOS (TestFlight)

```powershell
# プレビューでなく�Eロダクション同等�E internal build
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios --latest
```

App Store Connect > TestFlight > 「�E部チE��ト」グループを作�Eし、Apple ID を招征E��E
### Android (Play Console 冁E��チE��チE

```powershell
npx eas-cli build --profile production --platform android
npx eas-cli submit --platform android --latest
```

Play Console > チE��チE> 冁E��チE��チE> メーリングリストに Gmail を追加、E
---

## 6. 完亁E��溁E
Phase 4 は以下を全て満たした時点で完亁E

- バックエンチE(Functions + Rules) がデプロイ済み
- EAS Secrets ぁE6 件登録済み
- iOS / Android 両方のプレビュービルドが成功
- 上記「実機動作チェチE��リスト」を両 OS で完走
- 重大なクラチE��ュ / チE�Eタ消失 / 表示崩れがなぁE
完亁E��たら **Phase 5: ストアコンサブミチE��** へ進む、E
---

## トラブルシューチE��ング

### ビルド時 `Plugin "expo-dev-client" not found`

`app.config.js` で production プロファイル時に自動除外されてぁE��はず。`EAS_BUILD_PROFILE` 環墁E��数ぁEEAS Build で `production` に設定されてぁE��ことを確認、E
### `eas build` が中断 (`Apple Developer Account` 関連)

初回のみ Apple ID + パスワードと、忁E��に応じて App-Specific Password が忁E��、E[https://appleid.apple.com/account/manage](https://appleid.apple.com/account/manage) で生�E、E
### Functions 呼び出しで `unauthenticated`

クライアント�E匿名認証が完亁E��てぁE��ぁE��アプリ起動直後ではなく、�Eーム到達後にチE��ト、EFirebase Console > Authentication > Users で匿名ユーザーが増えてぁE��か確認、E
### Firestore Rules でアクセス拒否

Firebase Console > Firestore Database > ルールタブで現在のルールを確認し、`firestore.rules` と一致するか確認、E一致しなぁE��吁E`npm run rules:deploy` で再デプロイ、E
### レート制限が想定通り発火しなぁE
Firestore の `rateLimits/{uid}` ドキュメントを Firebase Console から確認、E`dailyCount` `minuteCount` フィールド�E値を見て、リセチE��条件 (`dayKey` / `minuteKey` 不一致でゼロリセチE��) が正しいか確認