import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PartnerType, Language, ActionSuggestion, ScoreEntry, RecoveryEffectSize, Badge } from '../types';
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
import {
  initBadges,
  checkNewBadges,
  calcNewStreak,
} from '../services/achievementService';

interface AppStore extends AppState {
  setOnboardingComplete: (value: boolean) => void;
  setSelectedPartner: (partner: PartnerType) => void;
  setBrainScore: (score: number) => void;
  setLanguage: (lang: Language) => void;
  setUserId: (id: string) => void;
  applyDecay: () => void;
  applyTestResult: (delta: number) => void;
  fetchAction: () => Promise<void>;
  completeAction: (difficulty?: ActionDifficulty) => void;
  skipAction: () => void;
  clearRecoveryEffect: () => void;
  dismissBadgePopup: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  markTestDone: () => void;
  syncProfile: () => Promise<void>;
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
  badges: initBadges(),
  newlyEarnedBadges: [],
  recoveryBoostCount: 0,
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
      setSelectedPartner:    (partner) => set({ selectedPartner: partner }),
      setBrainScore:         (score) => set({ brainScore: Math.min(100, Math.max(0, score)) }),
      setLanguage:           (lang) => set({ language: lang }),
      setUserId:             (id) => set({ userId: id }),

      applyDecay: () => {
        const { brainScore, lastDecayDate } = get();
        const today = todayString();
        if (lastDecayDate === today) return;
        const daysSince = getDaysSince(lastDecayDate ?? today);
        const decay = calculateDecay(brainScore, daysSince);
        const newScore = Math.max(0, brainScore - decay);
        set({ brainScore: newScore, lastDecayDate: today });
        const { selectedPartner, notificationsEnabled } = get();
        checkAndIntervene(newScore, selectedPartner ?? 'counselor', notificationsEnabled);
      },

      applyTestResult: (delta) => {
        const { brainScore } = get();
        set({ brainScore: Math.min(100, Math.max(0, brainScore + delta)), lastTestDate: todayString() });
      },

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

      completeAction: (difficulty) => {
        const {
          brainScore, totalXP, streak, lastActionDate,
          currentAction, userId, scoreHistory,
          badges, recoveryBoostCount, selectedPartner, notificationsEnabled,
        } = get();

        const today = todayString();
        const diff: ActionDifficulty = difficulty ?? currentAction?.difficulty ?? 'medium';
        const now = new Date();

        // ── ストリーク（寛容判定） ──
        const newStreak = calcNewStreak(streak, lastActionDate);

        // ── スコア・XP計算 ──
        const { scoreGain, xpGain } = calculateActionGain(diff, newStreak, brainScore);
        const newScore = Math.min(100, brainScore + scoreGain);
        const newXP    = totalXP + xpGain;
        const newLevel = getLevelFromXP(newXP).level;

        // ── 回復ブースト判定（低スコアからの回復） ──
        const isRecoveryBoost = brainScore < 40;
        const newRecoveryCount = isRecoveryBoost ? recoveryBoostCount + 1 : recoveryBoostCount;

        // ── エフェクトサイズ ──
        const effectSize: RecoveryEffectSize = getRecoveryEffectSize(xpGain);

        // ── 履歴エントリ ──
        const entry: ScoreEntry = {
          score: newScore, timestamp: Date.now(),
          actionTitle: currentAction?.title, xpGained: xpGain,
        };
        const newHistory = [entry, ...scoreHistory].slice(0, 60);

        // ── バッジチェック ──
        const newBadges = checkNewBadges(badges, {
          totalXP: newXP,
          streak: newStreak,
          currentLevel: newLevel,
          actionCount: newHistory.length,
          difficulty: diff,
          brainScoreBefore: brainScore,
          recoveryBoostCount: newRecoveryCount,
        });
        const updatedBadges = badges.map((b) => {
          const earned = newBadges.find((nb) => nb.id === b.id);
          return earned ? earned : b;
        });

        set({
          brainScore: newScore,
          totalXP: newXP,
          currentLevel: newLevel,
          streak: newStreak,
          lastActionDate: today,
          currentAction: null,
          pendingRecoveryEffect: effectSize,
          scoreHistory: newHistory,
          recoveryBoostCount: newRecoveryCount,
          badges: updatedBadges,
          newlyEarnedBadges: newBadges,
        });

        if (userId) saveScoreEntry(userId, entry).catch(() => {});
        checkAndIntervene(newScore, selectedPartner ?? 'counselor', notificationsEnabled);
      },

      skipAction:          () => set({ currentAction: null }),
      clearRecoveryEffect: () => set({ pendingRecoveryEffect: null }),
      dismissBadgePopup:   () => set((s) => ({ newlyEarnedBadges: s.newlyEarnedBadges.slice(1) })),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setReminderTime:         (hour, min) => set({ reminderHour: hour, reminderMinute: min }),
      markTestDone:            () => set({ lastTestDate: todayString() }),

      syncProfile: async () => {
        const { userId, selectedPartner, brainScore, language } = get();
        if (!userId || !selectedPartner) return;
        await saveUserProfile(userId, { partner: selectedPartner, brainScore, language }).catch(() => {});
      },

      resetAll: () => {
        const { userId } = get();
        set({ ...initialState, userId, badges: initBadges() });
      },
    }),
    {
      name: 'brain-detox-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete:  state.isOnboardingComplete,
        selectedPartner:       state.selectedPartner,
        language:              state.language,
        brainScore:            state.brainScore,
        totalXP:               state.totalXP,
        currentLevel:          state.currentLevel,
        streak:                state.streak,
        lastActionDate:        state.lastActionDate,
        lastDecayDate:         state.lastDecayDate,
        lastTestDate:          state.lastTestDate,
        notificationsEnabled:  state.notificationsEnabled,
        reminderHour:          state.reminderHour,
        reminderMinute:        state.reminderMinute,
        userId:                state.userId,
        scoreHistory:          state.scoreHistory,
        badges:                state.badges,
        recoveryBoostCount:    state.recoveryBoostCount,
      }),
    }
  )
);

export const waitForHydration = () =>
  new Promise<void>((resolve) => {
    if (useAppStore.persist.hasHydrated()) { resolve(); return; }
    const unsub = useAppStore.persist.onFinishHydration(() => { unsub(); resolve(); });
  });
