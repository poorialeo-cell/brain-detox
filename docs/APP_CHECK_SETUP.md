# Firebase App Check セットアップ手順

`openaiProxy` Function や Firestore を **正規のアプリ以外** (curl、エミュレータ改造版、改ざんビルド等) から呼ばれないようにする防御層。

## 現状

- `functions/src/index.ts`: `enforceAppCheck: false` (検証無効)
- クライアント側 `src/config/firebase.ts`: App Check 未初期化

このまま enforce 化すると **全 OpenAI 呼び出しが失敗する**ので、必ず以下の手順を順守する。

---

## ステップ 1: Firebase Console で App Check を有効化

1. Firebase Console > プロジェクト `brain-detox-bea63` > **「ビルド」→「App Check」**
2. **「アプリ」タブ**で iOS / Android アプリそれぞれを選択
3. プロバイダを設定:
  - **iOS**: `App Attest` (iOS 14+、推奨) または `DeviceCheck`
  - **Android**: `Play Integrity` (Google Play 配布版必須)
4. **デバッグトークン** (任意): 開発ビルドで通したい場合のみ、トークン発行 → クライアントログに出力された値を貼り付け

## ステップ 2: クライアント側 App Check 初期化

`src/config/firebase.ts` の末尾に追加 (まだ実装していない):

```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
// React Native では initializeAppCheck がブラウザ専用のため、
// 実機ビルドでは下記のような RNFirebase or @react-native-firebase/app-check が必要。
// Expo managed では現状 `expo-firebase-app-check` 等の OSS ラッパーを使うか、
// Custom Native Module が必要。要検討。
```

**重要**: Expo managed workflow では Firebase JS SDK の App Check はブラウザ専用。実機で App Check を使うには以下のいずれかが必要:

- **オプション A**: `@react-native-firebase/app-check` に移行 (require ejecting from JS SDK)
- **オプション B**: Custom Native Module を expo-modules-core で実装
- **オプション C**: App Check を諦め、レート制限とユーザー認証だけで防御

> **推奨**: 個人開発レベルではオプション C で十分。レート制限 (`enforceRateLimit`) + 匿名認証 + Firestore Rules で OpenAI コストは月数ドル以内に抑えられる。App Check は将来 DAU が増えてから検討で良い。

## ステップ 3: モニタリングモード (3-7 日)

1. Functions と Firestore は `enforce` にしない状態で、Console > App Check > **「指標」**を 3-7 日観測
2. **「未検証」トラフィックの割合**が 5% 未満であることを確認
  - 5% 超なら、未検証クライアント (古いビルド・改ざん版) の流入があるので enforce を待つ
  - 5% 未満なら enforce 化を判断

## ステップ 4: enforce に切り替え

### Functions 側

`functions/src/index.ts`:

```typescript
export const openaiProxy = onCall(
  {
    // ...
    enforceAppCheck: true,  // false → true
    // ...
  },
  // ...
);
```

```powershell
npm run functions:deploy
```

### Firestore 側

Firebase Console > Firestore Database > **「App Check」タブ**で「適用」をオンに。

## ロールバック手順

enforce 後に大量の失敗が発生した場合:

1. Console > App Check > 適用を即座にオフに戻す
2. `enforceAppCheck: false` に戻して `npm run functions:deploy`
3. ログを `firebase functions:log` で確認、原因特定

---

## Phase 4 では？

**スキップして OK**。Phase 4 の主目的は「実機で動くこと確認」なので、App Check 未対応でも問題ない。

Phase 5 (ストア提出) 前か Phase 6 (リリース後 1 週間以内) に判断する。