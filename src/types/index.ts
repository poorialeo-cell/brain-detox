import { ActionDifficulty } from '../config/scoringConfig';
export type { ActionDifficulty };

export type PartnerType = 'teacher' | 'counselor' | 'scientist' | 'trainer';
/** 立ち絵の種類（assets/partners のファイル名と対応） */
export type PartnerPose = 'gentle' | 'idle' | 'intro' | 'praise' | 'speak' | 'triumph';
export type Language = 'ja' | 'en' | 'th';
export type ThemeName = 'dark' | 'white' | 'green' | 'blue' | 'orange' | 'red';
export type RecoveryEffectSize = 'small' | 'medium' | 'large';
export interface ReminderTime {
  hour: number;
  minute: number;
}

/** テスト直後〜アクション完了または24h経過までのスコアサイクル（A, B 保持） */
export interface PostTestCycleState {
  /** Step1 直前のベーススコア A */
  baseA: number;
  /** テスト結果に基づく暫定スコア B */
  provisionalB: number;
  /** B を確定した時刻（ms）。24h ドリフトの起点 */
  cycleStartedAt: number;
}

// ── インタラクティブガイド ────────────────────────────────────────────
export type InteractiveType = 'none' | 'breathing' | 'timer';

export interface BreathingConfig {
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  cycles: number;
}

export interface TimerConfig {
  durationSeconds: number;
}

export interface ActionSuggestion {
  /** レパートリー ID */
  baseId: string;
  /** 脳への影響度 1（弱）〜5（強）。AI またはベース定義 */
  brainImpact: number;
  /** スコア計算用の目安所要秒（ガイド・表示の基準） */
  nominalDurationSeconds: number;

  title: string;
  description: string;
  duration: string;
  partnerMessage: string;
  difficulty: ActionDifficulty;
  interactiveType: InteractiveType;
  breathingConfig?: BreathingConfig;
  timerConfig?: TimerConfig;
  isOffline?: boolean;
}

/** テスト後（postTestCycle）向け・複数ステップのアクションプラン */
export interface ActiveActionPlan {
  steps: ActionSuggestion[];
  /** 現在のステップ（0 開始）。`currentAction === steps[stepIndex]` と同期 */
  stepIndex: number;
  /** 各ステップで実際にかかった秒（完了・スキップ順） */
  completedStepActualSeconds: number[];
  /** プラン全体の目安秒（合計） */
  totalNominalSeconds: number;
  /** プランブロック開始時の表示スコア（XP 倍率の基準） */
  anchorBrainScore: number;
}

export type ScoreHistoryKind = 'action' | 'brainRotTest';

export interface ScoreEntry {
  id?: string;
  score: number;
  timestamp: number;
  /** 省略時は action（actionTitle があるレガシー行） */
  kind?: ScoreHistoryKind;
  actionTitle?: string;
  xpGained?: number;
  /** その記録時点で加算されたブレインスコア（未保存の古い履歴では undefined） */
  scoreGain?: number;
  /** brainRotTest のときのスコア変動 */
  testDelta?: number;
}

// ── バッジ ────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  nameKey: string;
  descriptionKey: string;
  emoji: string;
  color: string;
  earnedAt: string | null; // ISO文字列、未獲得はnull
}

export interface AppState {
  // オンボーディング
  isOnboardingComplete: boolean;
  /** 設定からの「パートナー変更」時は診断の q4,q5 のみ出す */
  partnerQuizOnly: boolean;
  /** App ルート強制リマウント用（パートナー変更後のキャッシュ排除）永続化しない */
  appSessionKey: number;
  selectedPartner: PartnerType | null;
  language: Language;
  themeName: ThemeName;

  // スコア（継続的要素）
  brainScore: number;
  /** テスト後のドリフト中なら B〜(A+B)/2 の間を線形補間。アクション完了または24hで解除 */
  postTestCycle: PostTestCycleState | null;
  /**
   * 一時: フィードバック画面のカウントアップ用（永続化しない）
   * アクション完了直前の表示スコア
   */
  lastActionScoreBefore: number | null;
  /**
   * 一時: アクションで C > A のとき強い視覚フィードバック（永続化しない）
   */
  lastActionFeedbackEmphasized: boolean;

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
  /** テスト直後の複数アクションプラン（約30分） */
  activeActionPlan: ActiveActionPlan | null;
  isActionLoading: boolean;
  /** 直近の完了で加算したスコア（フィードバック画面表示用・永続化しない） */
  lastActionScoreGain: number | null;

  // 回復エフェクト（一時・非永続）
  pendingRecoveryEffect: RecoveryEffectSize | null;

  // バッジ
  badges: Badge[];
  newlyEarnedBadges: Badge[];   // ポップアップ表示キュー
  recoveryBoostCount: number;   // 急落からの回復回数

  // Firebase
  userId: string | null;

  // スコア履歴
  scoreHistory: ScoreEntry[];

  // アクションベースのローテーション
  actionRecentBaseIds: string[];
  actionBaseAffinity: Record<string, number>;
  pendingFeedbackBaseId: string | null;

  notificationsEnabled: boolean;
  reminderTimes: ReminderTime[];
}

export type RootStackParamList = {
  Quiz: undefined;
  PartnerResult: { partner: PartnerType };
  BrainRotTest: undefined;
  Main: undefined;
  DataResetConfirm: undefined;
  ThemeSelect: undefined;
  LanguageSelect: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Action: undefined;
  History: undefined;
  Settings: undefined;
};
