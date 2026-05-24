# 法的文書のホスティング手順

`docs/` 配下の HTML（プライバシーポリシー・利用規約）を **GitHub Pages** で公開する手順です。**App Store / Google Play 申請にはこれらの URL が必須** です。

---

## 前提

- GitHub に本リポジトリを push 済み
- 公開リポジトリ（private の場合は GitHub Pro / Team 以上が必要）

---

## 手順

### 1. 文書内のプレースホルダーを置換

`docs/` 配下の全 HTML ファイルと `legal/` 配下の Markdown ファイルで以下を実際の値に置換してください。

| プレースホルダー | 置換例 |
|---|---|
| `[YOUR_CONTACT_EMAIL]` | `support@brain-detox.app` |
| `[YOUR_NAME_OR_ORGANIZATION]` | `Taro Yamada` または `Brain Detox Inc.` |
| `[YOUR_GITHUB_USERNAME]` | `your-github-handle` |

PowerShell での一括置換例:

```powershell
# Email 置換
Get-ChildItem -Path docs,legal -Include *.html,*.md -Recurse | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace '\[YOUR_CONTACT_EMAIL\]', 'support@example.com' |
    Set-Content $_.FullName -NoNewline
}
# 運営者名 置換
Get-ChildItem -Path docs,legal -Include *.html,*.md -Recurse | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace '\[YOUR_NAME_OR_ORGANIZATION\]', 'Your Name' |
    Set-Content $_.FullName -NoNewline
}
```

### 2. GitHub に push

```powershell
git add docs/ legal/
git commit -m "docs: add privacy policy and terms of service"
git push origin main
```

### 3. GitHub Pages を有効化

1. GitHub のリポジトリページ → **Settings** → **Pages**
2. 「Build and deployment」セクションで:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/docs` フォルダを選択
3. **Save** をクリック
4. 数分後に `https://<YOUR_GITHUB_USERNAME>.github.io/brain-detox/` で公開される

### 4. 公開 URL の確認

ブラウザで以下にアクセスして表示されることを確認:

| ページ | URL |
|---|---|
| ランディング | `https://<USER>.github.io/brain-detox/` |
| プライバシー（日） | `https://<USER>.github.io/brain-detox/privacy-ja.html` |
| プライバシー（英） | `https://<USER>.github.io/brain-detox/privacy-en.html` |
| プライバシー（タイ） | `https://<USER>.github.io/brain-detox/privacy-th.html` |
| 規約（日） | `https://<USER>.github.io/brain-detox/terms-ja.html` |
| 規約（英） | `https://<USER>.github.io/brain-detox/terms-en.html` |
| 規約（タイ） | `https://<USER>.github.io/brain-detox/terms-th.html` |

### 5. アプリ内リンクの設定

`src/config/legalUrls.ts` で公開 URL を本番値に書き換えてください（初期値は `https://example.github.io/brain-detox/` がプレースホルダーで入っています）。

### 6. ストア申請時に提示する URL

- **App Store Connect → App Information → Privacy Policy URL**
  - `https://<USER>.github.io/brain-detox/privacy-en.html`（メインの言語版）
- **Google Play Console → App content → Privacy policy**
  - 同上
- **利用規約 URL**（任意・推奨）
  - `https://<USER>.github.io/brain-detox/terms-en.html`

---

## カスタムドメインを使う場合（任意）

1. ドメインを取得（例: `brain-detox.app`）
2. `docs/CNAME` ファイルを作成し、ドメイン名のみを記載
   ```
   brain-detox.app
   ```
3. DNS で CNAME レコードを `<USER>.github.io` に向ける
4. GitHub Pages 設定でカスタムドメインを入力 → **Enforce HTTPS** にチェック

---

## トラブルシューティング

- **404**: `/docs` フォルダの設定ミス。`Settings → Pages` で確認
- **CSS が当たらない**: `_assets/style.css` が push されているか確認
- **タイ語が文字化け**: HTML の `<meta charset="UTF-8">` を確認（既に設定済み）

---

## 更新の流れ

ポリシーを修正したら:
1. `legal/*.md` を編集（原本）
2. `docs/*.html` の対応部分を編集
3. 各ファイル冒頭の「最終更新日」を更新
4. `git push` で自動デプロイ
