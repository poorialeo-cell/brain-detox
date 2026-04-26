import { ActionDifficulty } from '../config/scoringConfig';
export type { ActionDifficulty };

export type PartnerType = 'teacher' | 'counselor' | 'scientist' | 'trainer';
export type Language = 'ja' | 'en' | 'th';
export type RecoveryEffectSize = 'small' | 'medium' | 'large';

export interface ActionSuggestion {
  title: string;
  description: string;
  duration: string;
  partnerMessage: string;
  difficulty: ActionDifficulty;
  isOffline?: boolean;
}

export interface ScoreEntry {
  id?: string;
  score: number;
  timestamp: number;
  actionTitle?: string;
  xpGained?: number;
}

export interface AppState {
  // オンボーディング
  isOnboardingComplete: boolean;
  selectedPartner: PartnerType | null;
  language: Language;

  // スコア（継続的要素）
  brainScore: number;

  // XP・レベル（累計要素）
  totalXP: number;
  currentLevel: number;

  // ストリーク
  streak: number;
  lastActionDate: string | null;       // "YYYY-MM-DD"

  // 減衰管理
  lastDecayDate: string | null;        // "YYYY-MM-DD"

  // ブレインロットテスト
  lastTestDate: string | null;         // "YYYY-MM-DD"

  // アクション（一時状態）
  currentAction: ActionSuggestion | null;
  isActionLoading: boolean;

  // 回復エフェクト（一時・非永続）
  pendingRecoveryEffect: RecoveryEffectSize | null;

  // Firebase
  userId: string | null;

  // スコア履歴
  scoreHistory: ScoreEntry[];

  // 通知設定
  notificationsEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export type RootStackParamList = {
  Quiz: undefined;
  PartnerResult: { partner: PartnerType };
  BrainRotTest: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Action: undefined;
  History: undefined;
  Settings: undefined;
};
