# ストア審査用 データ開示 cheatsheet

App Store Privacy Nutrition Label と Google Play Data Safety の入力欄に
**そのままコピペで使える形式** でまとめたチートシート。プライバシーポリシー（`legal/privacy-policy-*.md`）と整合しています。

---

## 0. 前提

| 項目 | 値 |
|---|---|
| アプリ名 | brain-detox |
| Bundle ID / Package | `com.braindetox.app` |
| 対象年齢 | 13 歳以上推奨（App Store: 17+、Google Play: Everyone 10+ 〜 Teen） |
| カテゴリ | ヘルス＆フィットネス または ライフスタイル |
| 課金 | 無料、アプリ内課金なし、広告なし |
| データの処理場所 | Firestore: 日本 (asia-northeast1) / OpenAI: アメリカ |

---

## 1. App Store Privacy Nutrition Label

App Store Connect → アプリ → **App プライバシー** での申告内容。

### 1-1. データの収集状況

| 区分 | 回答 |
|---|---|
| データを収集しますか？ | **はい** |
| データはユーザーに紐づきますか？ | **はい**（匿名 UID で識別） |
| 追跡（トラッキング）目的でデータを収集しますか？ | **いいえ** |

### 1-2. 収集するデータ種別の申告

以下のデータタイプを「収集する」として申告。

| データタイプ | カテゴリ | 用途 | リンクされる? | トラッキング? |
|---|---|---|---|---|
| **ユーザー ID** | Identifiers | App Functionality | Yes | **No** |
| **製品との対話 (Product Interaction)** | Usage Data | App Functionality | Yes | **No** |
| **その他の使用状況データ** | Usage Data | App Functionality | Yes | **No** |
| **診断データ (Crash Data)** | Diagnostics | App Functionality | No | **No** |

> 「ユーザー ID」は Firebase Auth の匿名 UID。氏名・メールアドレス・電話番号は収集しません。

### 1-3. 収集しないと申告するデータ（明示拒否）

以下は **「収集しない」** と申告:

- 連絡先情報（氏名・メールアドレス・電話番号・住所）
- 健康とフィットネス
- 金融情報
- 位置情報（精度を問わず）
- 機密情報
- 連絡先（電話帳）
- ユーザーコンテンツ（メール、メッセージ、写真、動画、音声、ゲームプレイ）
- 検索履歴
- 閲覧履歴
- カメラ・マイクのデータ
- センサーデータ

### 1-4. データの目的（Purpose）の設定

| 目的 | 該当する? |
|---|---|
| サードパーティ広告 | No |
| デベロッパーの広告またはマーケティング | No |
| アナリティクス | No |
| 製品のパーソナライズ | **Yes**（パートナータイプ・スコア帯に応じた提案） |
| App の機能 | **Yes** |
| その他の目的 | No |

### 1-5. プライバシーポリシー URL

```
https://[YOUR_GITHUB_USERNAME].github.io/brain-detox/privacy-en.html
```

### 1-6. ITSAppUsesNonExemptEncryption

`app.json` で既に **`false`** と申告済み（HTTPS 標準暗号のみ使用）。

---

## 2. Google Play Data Safety

Google Play Console → アプリ → **App content → Data safety** での申告内容。

### 2-1. データ収集の有無

| 項目 | 回答 |
|---|---|
| ユーザーまたはデバイスからデータを収集または共有しますか？ | **Yes (collect and share)** |
| すべてのユーザーデータを暗号化していますか？（転送中） | **Yes**（HTTPS / TLS） |
| ユーザーがデータの削除をリクエストできますか？ | **Yes**（アプリ内: 設定 → データをリセット） |

### 2-2. 収集するデータタイプ（Data types collected）

| データタイプ | 収集 | 共有 | 任意/必須 | 用途 |
|---|---|---|---|---|
| **App activity → App interactions** | Yes | No (※OpenAI へは匿名値のみ) | Required | App functionality |
| **App activity → Other actions** | Yes | No | Required | App functionality |
| **Personal info → User IDs** | Yes | No | Required | App functionality |

### 2-3. 各データタイプの詳細

#### App interactions
- **収集する内容**: パートナー選択履歴、ブレインスコア、ブレインロットテストの結果、アクション完了履歴
- **収集する理由**:
  - **App functionality** (ユーザーの進捗トラッキング)
  - **Personalization** (パートナーメッセージ・アクション提案)

#### User IDs
- **収集する内容**: Firebase Authentication が発行する匿名 UID
- **収集する理由**:
  - **App functionality** (端末間でのデータ同期、再インストール時の復元)

### 2-4. 第三者への共有（Data shared）

#### OpenAI へ送信される情報

| 項目 | 値 |
|---|---|
| 第三者 | OpenAI, L.L.C. |
| 共有されるデータ | ブレインスコア（0-100）、パートナータイプ、言語、直近 3 件のアクションタイトル要約 |
| 共有されないデータ | 匿名 UID、端末情報、PII |
| 目的 | アクション提案・パートナーメッセージ生成 |
| ユーザーの選択 | 必須（オフラインモードへのフォールバックあり） |

> OpenAI への送信は **Data sharing** に該当しますが、共有されるデータは個人を識別する情報を一切含みません。Google Play では「これは共有とみなされない」と判定される可能性が高い（送信先のサーバープロセスのみで使用、第三者の独立した目的での利用なし）です。控えめに **「共有あり」として申告** することを推奨します。

### 2-5. 収集しないと申告するデータ

以下は **収集しない** と明示:

- Personal info: Name, Email address, Phone number, Address, Race and ethnicity, Political or religious beliefs, Sexual orientation
- Financial info: User payment info, Purchase history, Credit score
- Health and fitness: Health info, Fitness info
- Messages: Emails, SMS or MMS, Other in-app messages
- Photos and videos
- Audio files
- Files and docs
- Calendar
- Contacts
- Location: Approximate, Precise
- Web browsing
- Device or other IDs: Advertising ID (IDFA/AAID)

### 2-6. セキュリティの慣行（Security practices）

| 質問 | 回答 |
|---|---|
| データは転送中に暗号化されますか？ | **Yes** (HTTPS / TLS) |
| ユーザーは収集されたデータの削除をリクエストできますか？ | **Yes** (in-app: Settings → Reset Data) |
| Play Families ポリシーに準拠していますか？ | **No** (13歳以上対象) |
| 独立したセキュリティレビューを受けていますか？ | No（未受審） |

### 2-7. プライバシーポリシー URL

```
https://[YOUR_GITHUB_USERNAME].github.io/brain-detox/privacy-en.html
```

---

## 3. App Store / Google Play 提出時のチェック

### 3-1. 共通

- [ ] プライバシーポリシー URL が公開・アクセス可能
- [ ] 利用規約 URL が公開・アクセス可能
- [ ] アプリ内 設定 → アプリ情報 → プライバシーポリシー / 利用規約 が開ける
- [ ] 設定 → データをリセット で実際に Firestore データも消える

### 3-2. App Store 固有

- [ ] App Store Connect: App プライバシー の申告完了
- [ ] Sign in with Apple は不要（匿名認証のみのため要求されない）
- [ ] アプリレビュー情報: 連絡先メールアドレス入力
- [ ] アプリレビュー情報: 「サインインは不要」とメモ
- [ ] レーティング: 17+ 推奨（ショート動画依存というキーワードのため）
- [ ] スクリーンショット: 6.7" 必須

### 3-3. Google Play 固有

- [ ] Data Safety フォームの全項目に回答
- [ ] Content rating: IARC アンケート完了（Everyone 10+ 〜 Teen 想定）
- [ ] Target audience: 13歳以上 を選択
- [ ] Ads declaration: 「No, this app doesn't contain ads」
- [ ] App access: 「ログイン不要」を選択（匿名認証は自動でログインされるため）

---

## 4. 想定される審査での質問と回答テンプレート

### Q1. 匿名認証だがユーザー ID を収集している意図は？

> The app uses Firebase Authentication's anonymous sign-in solely to issue an opaque, randomly-generated identifier that allows the user's progress (brain score, history, partner choice) to be backed up to Cloud Firestore and restored on app re-installation. This identifier is not linked to any personally identifiable information such as name, email, or phone number.

### Q2. OpenAI へどのようなデータを送っているか？

> Only non-identifiable data: current brain score (0-100), selected partner type (one of four), language preference (ja/en/th), and the first 90 characters of up to 3 recent action titles. The anonymous UID, device information, and any PII are never sent. OpenAI's API policy guarantees this data is not used for model training.

### Q3. データ削除リクエストへの対応は？

> Users can delete all their data at any time via Settings → Reset Data, which removes both local AsyncStorage data and their Firestore user document including the scoreHistory subcollection. For special requests, they can email the contact address listed in our Privacy Policy.

### Q4. なぜ通知権限を要求するか？

> Push notifications are used only for (1) optional daily reminders set by the user themselves in Settings, and (2) local notifications when an action timer finishes. The app fully functions without notification permission; the user is asked at the end of onboarding for an explicit opt-in.

---

## 5. 連絡先（プレースホルダー置換漏れチェック）

提出前に **必ず置換** すること:

| プレースホルダー | 置換先 |
|---|---|
| `[YOUR_CONTACT_EMAIL]` | 実際のメールアドレス（例: `support@brain-detox.app`） |
| `[YOUR_NAME_OR_ORGANIZATION]` | 個人名 or 法人名 |
| `[YOUR_GITHUB_USERNAME]` | GitHub のユーザー名 |

ファイルが残っているかチェック:
```powershell
Select-String -Path docs/*,legal/* -Pattern '\[YOUR_'
```
