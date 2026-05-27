# ストア審査用 チE�Eタ開示 cheatsheet

App Store Privacy Nutrition Label と Google Play Data Safety の入力欁E��
**そ�Eままコピ�Eで使える形弁E* でまとめたチ�Eトシート。�Eライバシーポリシー�E�Elegal/privacy-policy-*.md`�E�と整合してぁE��す、E
---

## 0. 前提

| 頁E�� | 値 |
|---|---|
| アプリ吁E| brain-detox |
| Bundle ID / Package | `com.braindetox.app` |
| 対象年齢 | 13 歳以上推奨�E�Epp Store: 17+、Google Play: Everyone 10+ 、ETeen�E�E|
| カチE��リ | ヘルス�E�E��ィチE��ネス また�E ライフスタイル |
| 課釁E| 無料、アプリ冁E��金なし、庁E��なぁE|
| チE�Eタの処琁E��所 | Firestore: 日本 (asia-northeast1) / OpenAI: アメリカ |

---

## 1. App Store Privacy Nutrition Label

App Store Connect ↁEアプリ ↁE**App プライバシー** での申告�E容、E
### 1-1. チE�Eタの収集状況E
| 区刁E| 回筁E|
|---|---|
| チE�Eタを収雁E��ますか�E�E| **はぁE* |
| チE�Eタはユーザーに紐づきますか�E�E| **はぁE*�E�匿吁EUID で識別�E�E|
| 追跡�E�トラチE��ング�E�目皁E��チE�Eタを収雁E��ますか�E�E| **ぁE��ぁE* |

### 1-2. 収集するチE�Eタ種別の申呁E
以下�EチE�Eタタイプを「収雁E��る」として申告、E
| チE�EタタイチE| カチE��リ | 用送E| リンクされめE | トラチE��ング? |
|---|---|---|---|---|
| **ユーザー ID** | Identifiers | App Functionality | Yes | **No** |
| **製品との対話 (Product Interaction)** | Usage Data | App Functionality | Yes | **No** |
| **そ�E他�E使用状況データ** | Usage Data | App Functionality | Yes | **No** |
| **診断チE�Eタ (Crash Data)** | Diagnostics | App Functionality | No | **No** |

> 「ユーザー ID」�E Firebase Auth の匿吁EUID。氏名・メールアドレス・電話番号は収集しません、E
### 1-3. 収集しなぁE��申告するデータ�E��E示拒否�E�E
以下�E **「収雁E��なぁE��E* と申呁E

- 連絡先情報�E�氏名・メールアドレス・電話番号・住所�E�E- 健康とフィチE��ネス
- 金融惁E��
- 位置惁E���E�精度を問わず�E�E- 機寁E��報
- 連絡先（電話帳�E�E- ユーザーコンチE��チE��メール、メチE��ージ、�E真、動画、E��声、ゲームプレイ�E�E- 検索履歴
- 閲覧履歴
- カメラ・マイクのチE�Eタ
- センサーチE�Eタ

### 1-4. チE�Eタの目皁E��Eurpose�E��E設宁E
| 目皁E| 該当すめE |
|---|---|
| サードパーチE��庁E�� | No |
| チE�EロチE��ーの庁E��また�Eマ�EケチE��ング | No |
| アナリチE��クス | No |
| 製品�Eパ�Eソナライズ | **Yes**�E�パートナータイプ�Eスコア帯に応じた提案！E|
| App の機�E | **Yes** |
| そ�E他�E目皁E| No |

### 1-5. プライバシーポリシー URL

```
https://poorialeo-cell.github.io/brain-detox/privacy-en.html
```

### 1-6. ITSAppUsesNonExemptEncryption

`app.json` で既に **`false`** と申告済み�E�ETTPS 標準暗号のみ使用�E�、E
---

## 2. Google Play Data Safety

Google Play Console ↁEアプリ ↁE**App content ↁEData safety** での申告�E容、E
### 2-1. チE�Eタ収集の有無

| 頁E�� | 回筁E|
|---|---|
| ユーザーまた�EチE��イスからチE�Eタを収雁E��た�E共有しますか�E�E| **Yes (collect and share)** |
| すべてのユーザーチE�Eタを暗号化してぁE��すか�E�（転送中�E�E| **Yes**�E�ETTPS / TLS�E�E|
| ユーザーがデータの削除をリクエストできますか�E�E| **Yes**�E�アプリ冁E 設宁EↁEチE�EタをリセチE���E�E|

### 2-2. 収集するチE�Eタタイプ！Eata types collected�E�E
| チE�EタタイチE| 収集 | 共朁E| 任愁E忁E��E| 用送E|
|---|---|---|---|---|
| **App activity ↁEApp interactions** | Yes | No (※OpenAI へは匿名値のみ) | Required | App functionality |
| **App activity ↁEOther actions** | Yes | No | Required | App functionality |
| **Personal info ↁEUser IDs** | Yes | No | Required | App functionality |

### 2-3. 吁E��ータタイプ�E詳細

#### App interactions
- **収集する冁E��**: パ�Eトナー選択履歴、ブレインスコア、ブレインロチE��チE��ト�E結果、アクション完亁E��歴
- **収集する琁E��**:
  - **App functionality** (ユーザーの進捗トラチE��ング)
  - **Personalization** (パ�EトナーメチE��ージ・アクション提桁E

#### User IDs
- **収集する冁E��**: Firebase Authentication が発行する匿吁EUID
- **収集する琁E��**:
  - **App functionality** (端末間でのチE�Eタ同期、�Eインスト�Eル時�E復允E

### 2-4. 第三老E��の共有！Eata shared�E�E
#### OpenAI へ送信される情報

| 頁E�� | 値 |
|---|---|
| 第三老E| OpenAI, L.L.C. |
| 共有されるチE�Eタ | ブレインスコア�E�E-100�E�、パートナータイプ、言語、直迁E3 件のアクションタイトル要紁E|
| 共有されなぁE��ータ | 匿吁EUID、端末惁E��、PII |
| 目皁E| アクション提案�Eパ�EトナーメチE��ージ生�E |
| ユーザーの選抁E| 忁E��（オフラインモードへのフォールバックあり�E�E|

> OpenAI への送信は **Data sharing** に該当しますが、�E有されるチE�Eタは個人を識別する惁E��を一刁E��みません、Eoogle Play では「これ�E共有とみなされなぁE��と判定される可能性が高い�E�送信先�Eサーバ�Eプロセスのみで使用、第三老E�E独立した目皁E��の利用なし）です。控えめに **「�E有あり」として申呁E* することを推奨します、E
### 2-5. 収集しなぁE��申告するデータ

以下�E **収集しなぁE* と明示:

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

### 2-6. セキュリチE��の慣行！Eecurity practices�E�E
| 質啁E| 回筁E|
|---|---|
| チE�Eタは転送中に暗号化されますか�E�E| **Yes** (HTTPS / TLS) |
| ユーザーは収集されたデータの削除をリクエストできますか�E�E| **Yes** (in-app: Settings ↁEReset Data) |
| Play Families ポリシーに準拠してぁE��すか�E�E| **No** (13歳以上対象) |
| 独立したセキュリチE��レビューを受けてぁE��すか�E�E| No�E�未受審�E�E|

### 2-7. プライバシーポリシー URL

```
https://poorialeo-cell.github.io/brain-detox/privacy-en.html
```

---

## 3. App Store / Google Play 提�E時�EチェチE��

### 3-1. 共送E
- [ ] プライバシーポリシー URL が�E開�Eアクセス可能
- [ ] 利用規紁EURL が�E開�Eアクセス可能
- [ ] アプリ冁E設宁EↁEアプリ惁E�� ↁEプライバシーポリシー / 利用規紁Eが開ける
- [ ] 設宁EↁEチE�EタをリセチE�� で実際に Firestore チE�Eタも消えめE
### 3-2. App Store 固朁E
- [ ] App Store Connect: App プライバシー の申告完亁E- [ ] Sign in with Apple は不要E��匿名認証のみのため要求されなぁE��E- [ ] アプリレビュー惁E��: 連絡先メールアドレス入劁E- [ ] アプリレビュー惁E��: 「サインインは不要」とメモ
- [ ] レーチE��ング: 17+ 推奨�E�ショート動画依存とぁE��キーワード�Eため�E�E- [ ] スクリーンショチE��: 6.7" 忁E��E
### 3-3. Google Play 固朁E
- [ ] Data Safety フォームの全頁E��に回筁E- [ ] Content rating: IARC アンケート完亁E��Everyone 10+ 、ETeen 想定！E- [ ] Target audience: 13歳以丁Eを選抁E- [ ] Ads declaration: 「No, this app doesn't contain ads、E- [ ] App access: 「ログイン不要」を選択（匿名認証は自動でログインされるためE��E
---

## 4. 想定される審査での質問と回答テンプレーチE
### Q1. 匿名認証だがユーザー ID を収雁E��てぁE��意図は�E�E
> The app uses Firebase Authentication's anonymous sign-in solely to issue an opaque, randomly-generated identifier that allows the user's progress (brain score, history, partner choice) to be backed up to Cloud Firestore and restored on app re-installation. This identifier is not linked to any personally identifiable information such as name, email, or phone number.

### Q2. OpenAI へどのようなチE�Eタを送ってぁE��か！E
> Only non-identifiable data: current brain score (0-100), selected partner type (one of four), language preference (ja/en/th), and the first 90 characters of up to 3 recent action titles. The anonymous UID, device information, and any PII are never sent. OpenAI's API policy guarantees this data is not used for model training.

### Q3. チE�Eタ削除リクエストへの対応�E�E�E
> Users can delete all their data at any time via Settings ↁEReset Data, which removes both local AsyncStorage data and their Firestore user document including the scoreHistory subcollection. For special requests, they can email the contact address listed in our Privacy Policy.

### Q4. なぜ通知権限を要求するか�E�E
> Push notifications are used only for (1) optional daily reminders set by the user themselves in Settings, and (2) local notifications when an action timer finishes. The app fully functions without notification permission; the user is asked at the end of onboarding for an explicit opt-in.

---

## 5. 連絡先（�Eレースホルダー置換漏れチェチE���E�E
提�E前に **忁E��置揁E* すること:

| プレースホルダー | 置換�E |
|---|---|
| `l.ikeda.937@gmail.com` | 実際のメールアドレス�E�侁E `support@brain-detox.app`�E�E|
| `池田怜雄` | 個人吁Eor 法人吁E|
| `poorialeo-cell` | GitHub のユーザー吁E|

ファイルが残ってぁE��かチェチE��:
```powershell
Select-String -Path docs/*,legal/* -Pattern '\[YOUR_'
```
