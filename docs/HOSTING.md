# 法的斁E��のホスチE��ング手頁E
`docs/` 配下�E HTML�E��Eライバシーポリシー・利用規紁E��を **GitHub Pages** で公開する手頁E��す、E*App Store / Google Play 申請にはこれら�E URL が忁E��E* です、E
---

## 前提

- GitHub に本リポジトリめEpush 済み
- 公開リポジトリ�E�Erivate の場合�E GitHub Pro / Team 以上が忁E��E��E
---

## 手頁E
### 1. 斁E��冁E�Eプレースホルダーを置揁E
`docs/` 配下�E全 HTML ファイルと `legal/` 配下�E Markdown ファイルで以下を実際の値に置換してください、E

| プレースホルダー                      | 置換侁E                                 |
| ----------------------------- | ------------------------------------ |
| `l.ikeda.937@gmail.com`        | `support@brain-detox.app`            |
| `池田怜雄` | `Taro Yamada` また�E `Brain Detox Inc.` |
| `poorialeo-cell`      | `your-github-handle`                 |


PowerShell での一括置換侁E

```powershell
# Email 置揁EGet-ChildItem -Path docs,legal -Include *.html,*.md -Recurse | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace '\[YOUR_CONTACT_EMAIL\]', 'support@example.com' |
    Set-Content $_.FullName -NoNewline
}
# 運営老E�� 置揁EGet-ChildItem -Path docs,legal -Include *.html,*.md -Recurse | ForEach-Object {
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

### 3. GitHub Pages を有効匁E
1. GitHub のリポジトリペ�Eジ ↁE**Settings** ↁE**Pages**
2. 「Build and deployment」セクションで:
  - **Source**: `Deploy from a branch`
  - **Branch**: `main` / `/docs` フォルダを選抁E3. **Save** をクリチE��
4. 数刁E��に `https://<YOUR_GITHUB_USERNAME>.github.io/brain-detox/` で公開される

### 4. 公閁EURL の確誁E
ブラウザで以下にアクセスして表示されることを確誁E


| ペ�Eジ        | URL                                                    |
| ---------- | ------------------------------------------------------ |
| ランチE��ング     | `https://<USER>.github.io/brain-detox/`                |
| プライバシー�E�日�E�E | `https://<USER>.github.io/brain-detox/privacy-ja.html` |
| プライバシー�E�英�E�E | `https://<USER>.github.io/brain-detox/privacy-en.html` |
| プライバシー�E�タイ�E�E| `https://<USER>.github.io/brain-detox/privacy-th.html` |
| 規紁E��日�E�E     | `https://<USER>.github.io/brain-detox/terms-ja.html`   |
| 規紁E��英�E�E     | `https://<USER>.github.io/brain-detox/terms-en.html`   |
| 規紁E��タイ�E�E    | `https://<USER>.github.io/brain-detox/terms-th.html`   |


### 5. アプリ冁E��ンクの設宁E
`src/config/legalUrls.ts` で公閁EURL を本番値に書き換えてください�E��E期値は `https://example.github.io/brain-detox/` が�Eレースホルダーで入ってぁE��す）、E
### 6. ストア申請時に提示する URL

- **App Store Connect ↁEApp Information ↁEPrivacy Policy URL**
  - `https://<USER>.github.io/brain-detox/privacy-en.html`�E�メインの言語版�E�E- **Google Play Console ↁEApp content ↁEPrivacy policy**
  - 同丁E- **利用規紁EURL**�E�任意�E推奨�E�E  - `https://<USER>.github.io/brain-detox/terms-en.html`

---

## カスタムドメインを使ぁE��合（任意！E
1. ドメインを取得（侁E `brain-detox.app`�E�E2. `docs/CNAME` ファイルを作�Eし、ドメイン名�Eみを記輁E  ```
   brain-detox.app
  ```
3. DNS で CNAME レコードを `<USER>.github.io` に向けめE4. GitHub Pages 設定でカスタムドメインを�E劁EↁE**Enforce HTTPS** にチェチE��

---

## トラブルシューチE��ング

- **404**: `/docs` フォルダの設定ミス。`Settings ↁEPages` で確誁E- **CSS が当たらなぁE*: `_assets/style.css` ぁEpush されてぁE��か確誁E- **タイ語が斁E��化ぁE*: HTML の `<meta charset="UTF-8">` を確認（既に設定済み�E�E
---

## 更新の流れ

ポリシーを修正しためE

1. `legal/*.md` を編雁E��原本�E�E2. `docs/*.html` の対応部刁E��編雁E3. 吁E��ァイル冒頭の「最終更新日」を更新
4. `git push` で自動デプロイ

