import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── キャンバスサイズ（ここを変えるだけでレイアウト調整） ────────────
export const CANVAS_WIDTH  = SCREEN_WIDTH - 44;
export const CANVAS_HEIGHT = 300;

// ── 脳のサイズ・位置（ここを変えるだけで調整） ──────────────────────
export const BRAIN_CENTER_X = CANVAS_WIDTH  / 2;
export const BRAIN_CENTER_Y = CANVAS_HEIGHT * 0.48;
export const BRAIN_SCALE    = 1.15;   // 大きさ倍率

// ── 地面の高さ ───────────────────────────────────────────────────────
export const GROUND_Y = CANVAS_HEIGHT * 0.72;

// ── 脳のパルス設定 ────────────────────────────────────────────────────
export const PULSE = {
  minScale:     1.0,
  maxScaleLow:  1.10,   // 低スコア時のパルス幅（大きく不規則に）
  maxScaleHigh: 1.04,   // 高スコア時のパルス幅（小さく規則的に）
  durationLow:  4200,   // ms（低スコア時はゆっくり）
  durationHigh: 1600,   // ms（高スコア時は速い）
};

// ── スコア → ビジュアルパラメータ補間テーブル ────────────────────────
// 各エントリはスコアの「キーフレーム」
export interface BrainFrame {
  score:        number;
  // 脳
  brainR: number; brainG: number; brainB: number;
  brain2R: number; brain2G: number; brain2B: number;  // 影側
  glowR: number; glowG: number; glowB: number;
  glowOpacity:  number;   // 外側グロー強度
  highlightOp:  number;   // 表面ハイライト強度
  sulciOpacity: number;   // しわ線の濃さ
  meltStrength: number;   // 溶け具合 (0-1)
  // 空
  skyTopR: number; skyTopG: number; skyTopB: number;
  skyBotR: number; skyBotG: number; skyBotB: number;
  // 地面
  groundR: number; groundG: number; groundB: number;
  // 植物
  grassAmt:  number;   // 草の量 (0-1)
  flowerAmt: number;   // 花の量 (0-1)
  treeAlive: number;   // 木の生命力 (0=枯れ 1=生き生き)
  // パーティクル
  ptR: number; ptG: number; ptB: number;
  ptCount: number;
  ptRiseSpeed: number; // 粒子上昇速度
}

export const BRAIN_FRAMES: BrainFrame[] = [
  {
    score: 0,
    brainR: 28,  brainG: 0,   brainB: 38,
    brain2R: 12, brain2G: 0,  brain2B: 18,
    glowR: 60,   glowG: 0,    glowB: 30,    glowOpacity: 0.0,
    highlightOp: 0.0, sulciOpacity: 0.85, meltStrength: 1.0,
    skyTopR: 6,  skyTopG: 0,  skyTopB: 10,
    skyBotR: 14, skyBotG: 4,  skyBotB: 18,
    groundR: 32, groundG: 14, groundB: 8,
    grassAmt: 0.0, flowerAmt: 0.0, treeAlive: 0.0,
    ptR: 40, ptG: 0, ptB: 25, ptCount: 8, ptRiseSpeed: 0.4,
  },
  {
    score: 25,
    brainR: 75,  brainG: 38,  brainB: 55,
    brain2R: 45, brain2G: 18, brain2B: 32,
    glowR: 90,   glowG: 20,   glowB: 50,    glowOpacity: 0.12,
    highlightOp: 0.04, sulciOpacity: 0.65, meltStrength: 0.55,
    skyTopR: 12, skyTopG: 5,  skyTopB: 20,
    skyBotR: 22, skyBotG: 10, skyBotB: 30,
    groundR: 48, groundG: 28, groundB: 14,
    grassAmt: 0.12, flowerAmt: 0.0, treeAlive: 0.1,
    ptR: 70, ptG: 30, ptB: 50, ptCount: 6, ptRiseSpeed: 0.45,
  },
  {
    score: 50,
    brainR: 140, brainG: 110, brainB: 175,
    brain2R: 95, brain2G: 70, brain2B: 130,
    glowR: 130,  glowG: 100,  glowB: 220,   glowOpacity: 0.28,
    highlightOp: 0.13, sulciOpacity: 0.38, meltStrength: 0.0,
    skyTopR: 14, skyTopG: 10, skyTopB: 42,
    skyBotR: 24, skyBotG: 18, skyBotB: 52,
    groundR: 32, groundG: 58, groundB: 24,
    grassAmt: 0.5, flowerAmt: 0.1, treeAlive: 0.5,
    ptR: 160, ptG: 130, ptB: 255, ptCount: 6, ptRiseSpeed: 0.55,
  },
  {
    score: 75,
    brainR: 230, brainG: 95,  brainB: 165,
    brain2R: 175, brain2G: 55, brain2B: 115,
    glowR: 235,  glowG: 80,   glowB: 160,   glowOpacity: 0.55,
    highlightOp: 0.22, sulciOpacity: 0.18, meltStrength: 0.0,
    skyTopR: 12, skyTopG: 18, skyTopB: 55,
    skyBotR: 20, skyBotG: 30, skyBotB: 65,
    groundR: 22, groundG: 80, groundB: 28,
    grassAmt: 0.8, flowerAmt: 0.6, treeAlive: 0.8,
    ptR: 250, ptG: 100, ptB: 180, ptCount: 8, ptRiseSpeed: 0.65,
  },
  {
    score: 100,
    brainR: 255, brainG: 215, brainB: 0,
    brain2R: 200, brain2G: 148, brain2B: 0,
    glowR: 255,  glowG: 225,  glowB: 60,    glowOpacity: 0.92,
    highlightOp: 0.38, sulciOpacity: 0.08, meltStrength: 0.0,
    skyTopR: 8,  skyTopG: 14, skyTopB: 50,
    skyBotR: 15, skyBotG: 25, skyBotB: 62,
    groundR: 18, groundG: 100, groundB: 30,
    grassAmt: 1.0, flowerAmt: 1.0, treeAlive: 1.0,
    ptR: 255, ptG: 220, ptB: 60, ptCount: 12, ptRiseSpeed: 0.8,
  },
];
