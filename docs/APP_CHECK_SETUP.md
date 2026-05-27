# Firebase App Check セチE��アチE�E手頁E
`openaiProxy` Function めEFirestore めE**正規�Eアプリ以夁E* (curl、エミュレータ改造版、改ざんビルド筁E から呼ばれなぁE��ぁE��する防御層、E
## 現状

- `functions/src/index.ts`: `enforceAppCheck: false` (検証無効)
- クライアント�E `src/config/firebase.ts`: App Check 未初期匁E
こ�Eまま enforce 化すると **全 OpenAI 呼び出しが失敗すめE*ので、忁E��以下�E手頁E��頁E��する、E
---

## スチE��チE1: Firebase Console で App Check を有効匁E
1. Firebase Console > プロジェクチE`brain-detox-bea63` > **「ビルド」�E「App Check、E*
2. **「アプリ」タチE*で iOS / Android アプリそれぞれを選抁E3. プロバイダを設宁E
  - **iOS**: `App Attest` (iOS 14+、推奨) また�E `DeviceCheck`
  - **Android**: `Play Integrity` (Google Play 配币E��忁E��E
4. **チE��チE��ト�Eクン** (任愁E: 開発ビルドで通したい場合�Eみ、トークン発衁EↁEクライアントログに出力された値を貼り付け

## スチE��チE2: クライアント�E App Check 初期匁E
`src/config/firebase.ts` の末尾に追加 (まだ実裁E��てぁE��ぁE:

```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
// React Native では initializeAppCheck がブラウザ専用のため、E// 実機ビルドでは下記�Eような RNFirebase or @react-native-firebase/app-check が忁E��、E// Expo managed では現状 `expo-firebase-app-check` 等�E OSS ラチE��ーを使ぁE��、E// Custom Native Module が忁E��。要検討、E```

**重要E*: Expo managed workflow では Firebase JS SDK の App Check はブラウザ専用。実機で App Check を使ぁE��は以下�EぁE��れかが忁E��E

- **オプション A**: `@react-native-firebase/app-check` に移衁E(require ejecting from JS SDK)
- **オプション B**: Custom Native Module めEexpo-modules-core で実裁E- **オプション C**: App Check を諦め、レート制限とユーザー認証だけで防御

> **推奨**: 個人開発レベルではオプション C で十�E。レート制陁E(`enforceRateLimit`) + 匿名認証 + Firestore Rules で OpenAI コスト�E月数ドル以冁E��抑えられる、Epp Check は封E�� DAU が増えてから検討で良ぁE��E
## スチE��チE3: モニタリングモーチE(3-7 日)

1. Functions と Firestore は `enforce` にしなぁE��態で、Console > App Check > **「指標、E*めE3-7 日観測
2. **「未検証」トラフィチE��の割吁E*ぁE5% 未満であることを確誁E  - 5% 趁E��ら、未検証クライアンチE(古ぁE��ルド�E改ざん牁E の流�Eがある�Eで enforce を征E��
  - 5% 未満なめEenforce 化を判断

## スチE��チE4: enforce に刁E��替ぁE
### Functions 側

`functions/src/index.ts`:

```typescript
export const openaiProxy = onCall(
  {
    // ...
    enforceAppCheck: true,  // false ↁEtrue
    // ...
  },
  // ...
);
```

```powershell
npm run functions:deploy
```

### Firestore 側

Firebase Console > Firestore Database > **「App Check」タチE*で「適用」をオンに、E
## ロールバック手頁E
enforce 後に大量�E失敗が発生した場吁E

1. Console > App Check > 適用を即座にオフに戻ぁE2. `enforceAppCheck: false` に戻して `npm run functions:deploy`
3. ログめE`firebase functions:log` で確認、原因特宁E
---

## Phase 4 では�E�E
**スキチE�Eして OK**。Phase 4 の主目皁E�E「実機で動くこと確認」なので、App Check 未対応でも問題なぁE��E
Phase 5 (ストア提�E) 前か Phase 6 (リリース征E1 週間以冁E に判断する