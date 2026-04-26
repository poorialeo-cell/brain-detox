import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PartnerType, Language, ActionSuggestion, ScoreEntry, RecoveryEffectSize } from '../types';
import { ActionDifficulty } from '../config/scoringConfig';
import { generateAction, getRandomFallback } from '../services/openAIService';
import { checkAndIntervene } from '../services/notificationService';
import { saveUserProfile, saveScoreEntry } from '../services/firestoreService';
import {
  calculateActionGain,
  calculateDecay,
  getLevelFromXP,
  getRecoveryEffectSize,
  todayString,
  getDaysSince,
} from '../services/scoringService';

interface AppStore extends AppState {
  // 基本設定
  setOnboardingComplete: (value: boolean) => void;
  setSelectedPartner: (partner: PartnerType) => void;
  setLanguage: (lang: Language) => void;
  setUserId: (id: string) => void;

  // スコア操作
  applyDecay: () => void;
  applyTestResult: (delta: number) => void;

  // アクション
  fetchAction: () => Promise<void>;
  completeAction: (difficulty?: ActionDifficulty) => void;
  skipAction: () => void;

  // 回復エフェクト
  clearRecoveryEffect: () => void;

  // 通知設定
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;

  // テスト
  markTestDone: () => void;

  // Firebase同期
  syncProfile: () => Promise<void>;

  // リセット
  resetAll: () => void;
}

const initialState: AppState = {
  isOnboardingComplete: false,
  selectedPartner: null,
  language: 'ja',
  brainScore: 50,
  totalXP: 0,
  currentLevel: 1,
  streak: 0,
  lastActionDate: null,
  lastDecayDate: null,
  lastTestDate: null,
  currentAction: null,
  isActionLoading: false,
  pendingRecoveryEffect: null,
  userId: null,
  scoreHistory: [],
  notificationsEnabled: false,
  reminderHour: 21,
  reminderMinute: 0,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
      setSelectedPartner: (partner) => set({ selectedPartner: partner }),
      setLanguage: (lang) => set({ language: lang }),
      setUserId: (id) => set({ userId: id }),

      // ── 自然減衰（アプリ起動時に呼ぶ）────────────────────────────
      applyDecay: () => {
        const { brainScore, lastDecayDate } = get();
        const today = todayString();
        if (lastDecayDate === today) return; // 今日すでに適用済み

        const daysSince = getDaysSince(lastDecayDate ?? today);
        const decay = calculateDecay(brainScore, daysSince);
        const newScore = Math.max(0, brainScore - decay);

        set({ brainScore: newScore, lastDecayDate: today });

        const { selectedPartner, notificationsEnabled } = get();
        checkAndIntervene(newScore, selectedPartner ?? 'counselor', notificationsEnabled);
      },

      // ── ブレインロットテスト結果を反映 ──────────────────────────
      applyTestResult: (delta) => {
        const { brainScore } = get();
        const newScore = Math.min(100, Math.max(0, brainScore + delta));
        set({ brainScore: newScore, lastTestDate: todayString() });
      },

      // ── アクション取得 ──────────────────────────────────────────
      fetchAction: async () => {
        const { selectedPartner, brainScore, language } = get();
        const partner = selectedPartner ?? 'counselor';
        set({ isActionLoading: true, currentAction: null });
        try {
          const action = await generateAction({ partner, brainScore, language });
          set({ currentAction: action, isActionLoading: false });
        } catch {
          const fallback = getRandomFallback(partner, language);
          set({ currentAction: fallback, isActionLoading: false });
        }
      },

      // ── アクション完了 ──────────────────────────────────────────
      completeAction: (difficulty) => {
        const { brainScore, totalXP, streak, lastActionDate, currentAction, userId, scoreHistory } = get();
        const today = todayString();

        // 難易度決定（引数 > currentAction > fallback medium）
        const diff: ActionDifficulty = difficulty ?? currentAction?.difficulty ?? 'medium';

        // ストリーク更新
        const lastDate = lastActionDate;
        const daysSinceLast = getDaysSince(lastDate);
        const newStreak = daysSinceLast <= 1 ? streak + 1 : 1;

        // スコア・XP計算
        const { scoreGain, xpGain } = calculateActionGain(diff, newStreak, brainScore);
        const newScore = Math.min(100, brainScore + scoreGain);
        const newXP = totalXP + xpGain;
        const newLevel = getLevelFromXP(newXP).level;

        // 回復エフェクトサイズ決定
        const effectSize: RecoveryEffectSize = getRecoveryEffectSize(xpGain);

        // 履歴エントリ
        const entry: ScoreEntry = {
          score: newScore,
          timestamp: Date.now(),
          actionTitle: currentAction?.title,
          xpGained: xpGain,
        };

        set({
          brainScore: newScore,
          totalXP: newXP,
          currentLevel: newLevel,
          streak: newStreak,
          lastActionDate: today,
          currentAction: null,
          pendingRecoveryEffect: effectSize,
          scoreHistory: [entry, ...scoreHistory].slice(0, 60),
        });

        // Firestore保存
        if (userId) saveScoreEntry(userId, entry).catch(() => {});

        // スコア低下時の介入通知チェック
        checkAndIntervene(newScore, get().selectedPartner ?? 'counselor', get().notificationsEnabled);
      },

      skipAction: () => set({ currentAction: null }),

      clearRecoveryEffect: () => set({ pendingRecoveryEffect: null }),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setReminderTime: (hour, minute) => set({ reminderHour: hour, reminderMinute: minute }),

      markTestDone: () => set({ lastTestDate: todayString() }),

      syncProfile: async () => {
        const { userId, selectedPartner, brainScore, language } = get();
        if (!userId || !selectedPartner) return;
        await saveUserProfile(userId, { partner: selectedPartner, brainScore, language }).catch(() => {});
      },

      resetAll: () => {
        const { userId } = get();
        set({ ...initialState, userId });
      },
    }),
    {
      name: 'brain-detox-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        selectedPartner: state.selectedPartner,
        language: state.language,
        brainScore: state.brainScore,
        totalXP: state.totalXP,
        currentLevel: state.currentLevel,
        streak: state.streak,
        lastActionDate: state.lastActionDate,
        lastDecayDate: state.lastDecayDate,
        lastTestDate: state.lastTestDate,
        notificationsEnabled: state.notificationsEnabled,
        reminderHour: state.reminderHour,
        reminderMinute: state.reminderMinute,
        userId: state.userId,
        scoreHistory: state.scoreHistory,
      }),
    }
  )
);

export const waitForHydration = () =>
  new Promise<void>((resolve) => {
    if (useAppStore.persist.hasHydrated()) { resolve(); return; }
    const unsub = useAppStore.persist.onFinishHydration(() => { unsub(); resolve(); });
  });
