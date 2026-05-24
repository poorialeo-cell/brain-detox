/**
 * パートナー立ち絵（縦3:横2フレーム）の基準。
 * 数値はフレームの「幅」。高さは自動で 1.5× になる。
 */
export const PARTNER_UI = {
  /** ホーム「Your Partner」左列の立ち絵幅（枠なし） */
  homePartnerSectionPortrait: 108,
  /** 診断結果ヒーロー：親の幅に対する 3:2 は PartnerScreen 側で aspectRatio 指定 */
  resultHeroCornerRadius: 16,
  /** アクション：生成中 */
  actionLoadingPortrait: 132,
  /** アクション：吹き出し横 */
  actionBubblePortrait: 80,
  /** 設定 */
  settingsPortrait: 76,
  /** バッジポップ */
  badgePortrait: 68,
} as const;
