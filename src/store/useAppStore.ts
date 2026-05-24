import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PartnerType, Language, ScoreEntry, RecoveryEffectSize, Badge, ThemeName, ReminderTime } from '../types';
import { ActionDifficulty } from '../config/scoringConfig';
import { generateActionFromBase, generateActionPlanFromTestScores, buildRecentActionSummary } from '../services/openAIService';
import { sumPlanNominalSeconds, buildOfflineActionPlanSteps } from '../services/actionPlanService';
import { buildOfflineActionFromBaseSafe } from '../services/buildOfflineAction';
import { pickNextBaseId, pushRecentBaseId, applyGoodReactionAffinity } from '../services/actionBaseSelection';
import { getNominalDurationSeconds } from '../utils/actionDuration';
import { checkAndIntervene } from '../services/notificationService';
import { saveUserProfile, saveScoreEntry, deleteUserData } from '../services/firestoreService';
import {
  calculateDurationImpactGain,
  calculateDecay,
  getLevelFromXP,
  getRecoveryEffectSize,
  todayString,
  getDaysSince,
  getEffectiveBrainScore,
  computeConfirmedScoreAfterAction,
  computePlanAchievementRatio,
  POST_TEST_DRIFT_HOURS,
} from '../services/scoringService';
import { getBrainRotTestEligibility } from '../utils/brainRotTestLimits';
import {
  initBadges,
  checkNewBadges,
  calcNewStreak,
} from '../services/achievementService';
import { i18n } from '../hooks/useI18n';
import { DEFAULT_THEME } from '../theme/palettes';

interface AppStore extends AppState {
  setOnboardingComplete: (value: boolean) => void;
  setPartnerQuizOnly: (value: boolean) => void;
  bumpAppSession: () => void;
  setSelectedPartner: (partner: PartnerType | null) => void;
  setBrainScore: (score: number) => void;
  setLanguage: (lang: Language) => void;
  setThemeName: (themeName: ThemeName) => void;
  setUserId: (id: string) => void;
  applyDecay: () => void;
  /** テスト後24hドリフト終了なら (A+B)/2 に確定 */
  finalizeExpiredPostTestCycleIfNeeded: () => void;
  applyTestResult: (delta: number) => void;
  fetchAction: () => Promise<void>;
  /** プランを破棄してAIで再生成（オフラインプランからの復帰用） */
  regenerateActionPlan: () => Promise<void>;
  fetchActionOffline: () => void;
  completeAction: (opts?: { actualDurationSeconds?: number }) => void;
  registerActionFeedback: (reactionKey: string | null) => void;
  skipAction: () => void;
  clearRecoveryEffect: () => void;
  dismissBadgePopup: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTimes: (times: ReminderTime[]) => void;
  markTestDone: () => void;
  syncProfile: () => Promise<void>;
  resetAll: () => void;
}

const initialState: AppState = {
  isOnboardingComplete: false,
  partnerQuizOnly: false,
  appSessionKey: 0,
  selectedPartner: null,
  language: 'ja',
  themeName: DEFAULT_THEME,
  brainScore: 50,
  postTestCycle: null,
  lastActionScoreBefore: null,
  lastActionFeedbackEmphasized: false,
  totalXP: 0,
  currentLevel: 1,
  streak: 0,
  lastActionDate: null,
  lastDecayDate: null,
  lastTestDate: null,
  currentAction: null,
  activeActionPlan: null,
  isActionLoading: false,
  lastActionScoreGain: null,
  pendingRecoveryEffect: null,
  badges: initBadges(),
  newlyEarnedBadges: [],
  recoveryBoostCount: 0,
  userId: null,
  scoreHistory: [],
  notificationsEnabled: false,
  reminderTimes: [{ hour: 21, minute: 0 }],
  actionRecentBaseIds: [],
  actionBaseAffinity: {},
  pendingFeedbackBaseId: null,
};

let actionFetchRequestId = 0;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
      setPartnerQuizOnly:    (value) => set({ partnerQuizOnly: value }),
      bumpAppSession:        () => set((s) => ({ appSessionKey: s.appSessionKey + 1 })),
      setSelectedPartner:    (partner) => set({ selectedPartner: partner }),
      setBrainScore:         (score) => set({
        brainScore: Math.min(100, Math.max(0, score)),
        postTestCycle: null,
        activeActionPlan: null,
      }),
      setLanguage:           (lang) => {
        set({ language: lang });
        void i18n.changeLanguage(lang);
        if (get().isOnboardingComplete) {
          void get().fetchAction();
        }
      },
      setThemeName:          (themeName) => set({ themeName }),
      setUserId:             (id) => set({ userId: id }),

      finalizeExpiredPostTestCycleIfNeeded: () => {
        const { postTestCycle } = get();
        if (!postTestCycle) return;
        const hours = (Date.now() - postTestCycle.cycleStartedAt) / (1000 * 60 * 60);
        if (hours < POST_TEST_DRIFT_HOURS) return;
        const settled = Math.round((postTestCycle.baseA + postTestCycle.provisionalB) / 2);
        set({
          brainScore: Math.min(100, Math.max(0, settled)),
          postTestCycle: null,
          activeActionPlan: null,
          currentAction: null,
        });
      },

      applyDecay: () => {
        get().finalizeExpiredPostTestCycleIfNeeded();
        const { brainScore, lastDecayDate, postTestCycle } = get();
        const today = todayString();
        if (lastDecayDate === today) return;
        if (postTestCycle) {
          set({ lastDecayDate: today });
          return;
        }
        const daysSince = getDaysSince(lastDecayDate ?? today);
        const decay = calculateDecay(brainScore, daysSince);
        const newScore = Math.max(0, brainScore - decay);
        set({ brainScore: newScore, lastDecayDate: today });
        const { selectedPartner, notificationsEnabled } = get();
        checkAndIntervene(newScore, selectedPartner ?? 'counselor', notificationsEnabled);
      },

      applyTestResult: (delta) => {
        get().finalizeExpiredPostTestCycleIfNeeded();
        const s = get();
        const { scoreHistory, userId } = s;
        if (!getBrainRotTestEligibility(scoreHistory, Date.now()).ok) return;
        // delta を ±30 にクランプ（クライアント改ざん対策・異常値防止）
        const clampedDelta = Math.min(30, Math.max(-30, Math.round(delta)));
        const A = getEffectiveBrainScore(s);
        const B = Math.min(100, Math.max(0, A + clampedDelta));
        const entry: ScoreEntry = {
          score: B,
          timestamp: Date.now(),
          kind: 'brainRotTest',
          testDelta: clampedDelta,
        };
        const newHistory = [entry, ...scoreHistory].slice(0, 60);
        const now = Date.now();
        set({
          brainScore: B,
          postTestCycle: {
            baseA: A,
            provisionalB: B,
            cycleStartedAt: now,
          },
          activeActionPlan: null,
          currentAction: null,
          lastTestDate: todayString(),
          scoreHistory: newHistory,
        });
        if (userId) saveScoreEntry(userId, entry).catch(() => {});
      },

      fetchAction: async () => {
        get().finalizeExpiredPostTestCycleIfNeeded();
        const state = get();
        let { activeActionPlan } = state;
        const {
          selectedPartner,
          brainScore,
          postTestCycle,
          language,
          actionRecentBaseIds,
          actionBaseAffinity,
          scoreHistory,
        } = state;
        const effectiveScore = getEffectiveBrainScore({ brainScore, postTestCycle });
        const partner = selectedPartner ?? 'counselor';
        const requestId = ++actionFetchRequestId;

        if (!postTestCycle && activeActionPlan) {
          set({ activeActionPlan: null });
          activeActionPlan = null;
        }

        if (postTestCycle && activeActionPlan && activeActionPlan.steps.length > 0) {
          const idx = activeActionPlan.stepIndex;
          if (idx < activeActionPlan.steps.length) {
            set({
              currentAction: activeActionPlan.steps[idx],
              isActionLoading: false,
            });
            return;
          }
        }

        if (postTestCycle && (!activeActionPlan || activeActionPlan.steps.length === 0)) {
          set({ isActionLoading: true, currentAction: null });
          try {
            const steps = await generateActionPlanFromTestScores({
              baseA: postTestCycle.baseA,
              provisionalB: postTestCycle.provisionalB,
              partner,
              language,
              scoreHistory,
            });
            if (requestId !== actionFetchRequestId) return;
            const totalNominal = sumPlanNominalSeconds(steps);
            const anchor = effectiveScore;
            set({
              activeActionPlan: {
                steps,
                stepIndex: 0,
                completedStepActualSeconds: [],
                totalNominalSeconds: totalNominal,
                anchorBrainScore: anchor,
              },
              currentAction: steps[0] ?? null,
              isActionLoading: false,
            });
          } catch {
            if (requestId !== actionFetchRequestId) return;
            set({ isActionLoading: false });
          }
          return;
        }

        set({ isActionLoading: true, currentAction: null });
        const baseId = pickNextBaseId({
          recentBaseIds: actionRecentBaseIds,
          baseAffinityBonus: actionBaseAffinity,
        });
        const recentActionSummary = buildRecentActionSummary(scoreHistory, language);
        try {
          const action = await generateActionFromBase({ baseId, partner, brainScore: effectiveScore, language, recentActionSummary });
          if (requestId !== actionFetchRequestId) return;
          set({
            currentAction: action,
            isActionLoading: false,
            actionRecentBaseIds: pushRecentBaseId(actionRecentBaseIds, baseId),
          });
        } catch {
          if (requestId !== actionFetchRequestId) return;
          const action = buildOfflineActionFromBaseSafe(baseId, partner, language);
          set({
            currentAction: action,
            isActionLoading: false,
            actionRecentBaseIds: pushRecentBaseId(actionRecentBaseIds, baseId),
          });
        }
      },

      regenerateActionPlan: async () => {
        set({ activeActionPlan: null, currentAction: null });
        await get().fetchAction();
      },

      fetchActionOffline: () => {
        get().finalizeExpiredPostTestCycleIfNeeded();
        const { postTestCycle, selectedPartner, language, actionRecentBaseIds, actionBaseAffinity, brainScore } = get();
        const partner = selectedPartner ?? 'counselor';
        ++actionFetchRequestId;

        if (postTestCycle) {
          const effectiveScore = getEffectiveBrainScore({ brainScore, postTestCycle });
          const steps = buildOfflineActionPlanSteps(
            postTestCycle.baseA,
            postTestCycle.provisionalB,
            partner,
            language,
          );
          const totalNominal = sumPlanNominalSeconds(steps);
          set({
            activeActionPlan: {
              steps,
              stepIndex: 0,
              completedStepActualSeconds: [],
              totalNominalSeconds: totalNominal,
              anchorBrainScore: effectiveScore,
            },
            currentAction: steps[0] ?? null,
            isActionLoading: false,
          });
          return;
        }

        const baseId = pickNextBaseId({
          recentBaseIds: actionRecentBaseIds,
          baseAffinityBonus: actionBaseAffinity,
        });
        const action = buildOfflineActionFromBaseSafe(baseId, partner, language);
        set({
          currentAction: action,
          isActionLoading: false,
          actionRecentBaseIds: pushRecentBaseId(actionRecentBaseIds, baseId),
        });
      },

      completeAction: (opts) => {
        get().finalizeExpiredPostTestCycleIfNeeded();
        const state = get();
        const {
          postTestCycle,
          activeActionPlan,
          totalXP,
          streak,
          lastActionDate,
          currentAction,
          userId,
          scoreHistory,
          badges,
          recoveryBoostCount,
          selectedPartner,
          notificationsEnabled,
          actionRecentBaseIds,
        } = state;

        if (!currentAction) return;
        if (postTestCycle && !activeActionPlan) return;

        const today = todayString();
        const diff: ActionDifficulty = currentAction.difficulty ?? 'medium';
        const planned = getNominalDurationSeconds(currentAction);
        const actualRaw = opts?.actualDurationSeconds ?? planned;
        const actual = Math.max(0, actualRaw);
        const brainImpact = currentAction.brainImpact ?? 3;
        const feedbackBaseId = currentAction.baseId;

        const newStreak = calcNewStreak(streak, lastActionDate);
        const effectiveBefore = getEffectiveBrainScore(state);

        if (postTestCycle && activeActionPlan) {
          const plan = activeActionPlan;
          const step = plan.steps[plan.stepIndex];
          if (!step || step.baseId !== currentAction.baseId) return;

          const newActuals = [...plan.completedStepActualSeconds, actual];
          const nextIdx = plan.stepIndex + 1;
          let recent = pushRecentBaseId(actionRecentBaseIds, currentAction.baseId);

          if (nextIdx < plan.steps.length) {
            set({
              activeActionPlan: {
                ...plan,
                stepIndex: nextIdx,
                completedStepActualSeconds: newActuals,
              },
              currentAction: plan.steps[nextIdx],
              actionRecentBaseIds: recent,
            });
            return;
          }

          const { baseA, provisionalB } = postTestCycle;
          const totalActual = newActuals.reduce((a, b) => a + b, 0);
          const r = computePlanAchievementRatio(plan.totalNominalSeconds, totalActual);
          const C = computeConfirmedScoreAfterAction(baseA, provisionalB, r);
          const newScore = Math.min(100, Math.max(0, Math.round(C)));
          const scoreDelta = newScore - effectiveBefore;
          const anchor = plan.anchorBrainScore;

          let xpSum = 0;
          for (let i = 0; i < plan.steps.length; i++) {
            const st = plan.steps[i];
            const pl = getNominalDurationSeconds(st);
            const act = newActuals[i] ?? 0;
            if (act < 1) continue;
            const { xpGain } = calculateDurationImpactGain({
              brainImpact: st.brainImpact ?? 3,
              plannedSeconds: pl,
              actualSeconds: Math.max(15, act),
              difficulty: st.difficulty ?? 'medium',
              streak: newStreak,
              brainScore: anchor,
            });
            xpSum += xpGain;
          }

          const newXP = totalXP + xpSum;
          const newLevel = getLevelFromXP(newXP).level;
          const isRecoveryBoost = effectiveBefore < 40;
          const newRecoveryCount = isRecoveryBoost ? recoveryBoostCount + 1 : recoveryBoostCount;
          const effectSize: RecoveryEffectSize = getRecoveryEffectSize(xpSum);

          const planSummary = plan.steps.map((s) => s.title).join(' → ');
          const entry: ScoreEntry = {
            score: newScore,
            timestamp: Date.now(),
            kind: 'action',
            actionTitle: planSummary.length > 90 ? `${planSummary.slice(0, 87)}…` : planSummary,
            xpGained: xpSum,
            scoreGain: scoreDelta,
          };
          const newHistory = [entry, ...scoreHistory].slice(0, 60);
          const lastStepDiff = plan.steps[plan.steps.length - 1]?.difficulty ?? diff;

          const newBadges = checkNewBadges(badges, {
            totalXP: newXP,
            streak: newStreak,
            currentLevel: newLevel,
            actionCount: newHistory.filter((e) => e.kind !== 'brainRotTest').length,
            difficulty: lastStepDiff,
            brainScoreBefore: effectiveBefore,
            recoveryBoostCount: newRecoveryCount,
          });
          const updatedBadges = badges.map((b) => {
            const earned = newBadges.find((nb) => nb.id === b.id);
            return earned ? earned : b;
          });

          const emphasized = newScore > baseA;

          set({
            brainScore: newScore,
            postTestCycle: null,
            activeActionPlan: null,
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
            lastActionScoreGain: scoreDelta,
            lastActionScoreBefore: effectiveBefore,
            lastActionFeedbackEmphasized: emphasized,
            pendingFeedbackBaseId: feedbackBaseId,
            actionRecentBaseIds: recent,
          });

          if (userId) saveScoreEntry(userId, entry).catch(() => {});
          checkAndIntervene(newScore, selectedPartner ?? 'counselor', notificationsEnabled);
          return;
        }

        const actualSingle = Math.max(15, actualRaw);
        const { scoreGain, xpGain } = calculateDurationImpactGain({
          brainImpact,
          plannedSeconds: planned,
          actualSeconds: actualSingle,
          difficulty: diff,
          streak: newStreak,
          brainScore: effectiveBefore,
        });
        const newScore = Math.min(100, effectiveBefore + scoreGain);
        const newXP = totalXP + xpGain;
        const newLevel = getLevelFromXP(newXP).level;

        const isRecoveryBoost = effectiveBefore < 40;
        const newRecoveryCount = isRecoveryBoost ? recoveryBoostCount + 1 : recoveryBoostCount;

        const effectSize: RecoveryEffectSize = getRecoveryEffectSize(xpGain);

        const entry: ScoreEntry = {
          score: newScore,
          timestamp: Date.now(),
          kind: 'action',
          actionTitle: currentAction.title,
          xpGained: xpGain,
          scoreGain,
        };
        const newHistory = [entry, ...scoreHistory].slice(0, 60);

        const newBadges = checkNewBadges(badges, {
          totalXP: newXP,
          streak: newStreak,
          currentLevel: newLevel,
          actionCount: newHistory.filter((e) => e.kind !== 'brainRotTest').length,
          difficulty: diff,
          brainScoreBefore: effectiveBefore,
          recoveryBoostCount: newRecoveryCount,
        });
        const updatedBadges = badges.map((b) => {
          const earned = newBadges.find((nb) => nb.id === b.id);
          return earned ? earned : b;
        });

        set({
          brainScore: newScore,
          postTestCycle: null,
          activeActionPlan: null,
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
          lastActionScoreGain: scoreGain,
          lastActionScoreBefore: null,
          lastActionFeedbackEmphasized: false,
          pendingFeedbackBaseId: feedbackBaseId,
        });

        if (userId) saveScoreEntry(userId, entry).catch(() => {});
        checkAndIntervene(newScore, selectedPartner ?? 'counselor', notificationsEnabled);
      },

      registerActionFeedback: (reactionKey) => {
        const { pendingFeedbackBaseId, actionBaseAffinity } = get();
        if (!pendingFeedbackBaseId) return;
        if (reactionKey === 'reactionGreat') {
          set({
            actionBaseAffinity: applyGoodReactionAffinity(actionBaseAffinity, pendingFeedbackBaseId),
            pendingFeedbackBaseId: null,
            lastActionScoreBefore: null,
            lastActionFeedbackEmphasized: false,
          });
        } else {
          set({
            pendingFeedbackBaseId: null,
            lastActionScoreBefore: null,
            lastActionFeedbackEmphasized: false,
          });
        }
      },

      skipAction: () => {
        const { postTestCycle, activeActionPlan, currentAction } = get();
        if (postTestCycle && activeActionPlan && currentAction) {
          get().completeAction({ actualDurationSeconds: 0 });
          return;
        }
        set({ currentAction: null });
      },
      clearRecoveryEffect: () => set({ pendingRecoveryEffect: null }),
      dismissBadgePopup:   () => set((s) => ({ newlyEarnedBadges: s.newlyEarnedBadges.slice(1) })),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setReminderTimes:        (times) => set({ reminderTimes: times }),
      markTestDone:            () => set({ lastTestDate: todayString() }),

      syncProfile: async () => {
        const { userId, selectedPartner, brainScore, postTestCycle, language } = get();
        if (!userId || !selectedPartner) return;
        const effective = getEffectiveBrainScore({ brainScore, postTestCycle });
        await saveUserProfile(userId, { partner: selectedPartner, brainScore: effective, language }).catch(() => {});
      },

      resetAll: () => {
        const { userId } = get();
        // Firestore のユーザーデータ（プロフィール + scoreHistory）を非同期で削除
        // GDPR / CCPA / App Store ガイドライン: ユーザー操作で全データを完全消去できること
        if (userId) {
          void deleteUserData(userId).catch((e) => {
            if (__DEV__) console.warn('[resetAll] deleteUserData failed', e);
          });
        }
        // ローカル状態をリセット（userId は維持して匿名アカウントは継続）
        set({ ...initialState, userId, badges: initBadges() });
        void i18n.changeLanguage(initialState.language);
      },
    }),
    {
      name: 'brain-detox-storage',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState>;
        return {
          ...current,
          ...(persisted as object),
          appSessionKey: (current as AppState).appSessionKey,
          partnerQuizOnly: Boolean(p?.partnerQuizOnly),
          themeName: typeof p?.themeName === 'string' ? (p.themeName as ThemeName) : current.themeName,
          actionRecentBaseIds: Array.isArray(p?.actionRecentBaseIds) ? p.actionRecentBaseIds! : current.actionRecentBaseIds,
          actionBaseAffinity:
            p?.actionBaseAffinity && typeof p.actionBaseAffinity === 'object'
              ? p.actionBaseAffinity
              : current.actionBaseAffinity,
          reminderTimes:
            Array.isArray(p?.reminderTimes) && p.reminderTimes.length > 0
              ? p.reminderTimes
              : (typeof (p as { reminderHour?: unknown })?.reminderHour === 'number' &&
                typeof (p as { reminderMinute?: unknown })?.reminderMinute === 'number')
                  ? [{
                    hour: Number((p as { reminderHour: number }).reminderHour),
                    minute: Number((p as { reminderMinute: number }).reminderMinute),
                  }]
                  : current.reminderTimes,
          postTestCycle:
            p?.postTestCycle &&
            typeof (p.postTestCycle as { baseA?: unknown }).baseA === 'number' &&
            typeof (p.postTestCycle as { provisionalB?: unknown }).provisionalB === 'number' &&
            typeof (p.postTestCycle as { cycleStartedAt?: unknown }).cycleStartedAt === 'number'
              ? (p.postTestCycle as AppState['postTestCycle'])
              : current.postTestCycle,
          activeActionPlan:
            p?.activeActionPlan &&
            Array.isArray(p.activeActionPlan.steps) &&
            p.activeActionPlan.steps.length > 0 &&
            typeof p.activeActionPlan.stepIndex === 'number' &&
            typeof p.activeActionPlan.totalNominalSeconds === 'number' &&
            typeof p.activeActionPlan.anchorBrainScore === 'number' &&
            Array.isArray(p.activeActionPlan.completedStepActualSeconds)
              ? (p.activeActionPlan as AppState['activeActionPlan'])
              : current.activeActionPlan,
          pendingFeedbackBaseId: null,
          lastActionScoreGain: null,
          lastActionScoreBefore: null,
          lastActionFeedbackEmphasized: false,
        };
      },
      partialize: (state) => ({
        isOnboardingComplete:  state.isOnboardingComplete,
        partnerQuizOnly:       state.partnerQuizOnly,
        selectedPartner:       state.selectedPartner,
        language:              state.language,
        themeName:             state.themeName,
        brainScore:            state.brainScore,
        postTestCycle:         state.postTestCycle,
        activeActionPlan:      state.activeActionPlan,
        totalXP:               state.totalXP,
        currentLevel:          state.currentLevel,
        streak:                state.streak,
        lastActionDate:        state.lastActionDate,
        lastDecayDate:         state.lastDecayDate,
        lastTestDate:          state.lastTestDate,
        notificationsEnabled:  state.notificationsEnabled,
        reminderTimes:         state.reminderTimes,
        userId:                state.userId,
        scoreHistory:          state.scoreHistory,
        badges:                state.badges,
        recoveryBoostCount:    state.recoveryBoostCount,
        actionRecentBaseIds:   state.actionRecentBaseIds,
        actionBaseAffinity:    state.actionBaseAffinity,
      }),
    }
  )
);

export const waitForHydration = () =>
  new Promise<void>((resolve) => {
    if (useAppStore.persist.hasHydrated()) { resolve(); return; }
    const unsub = useAppStore.persist.onFinishHydration(() => { unsub(); resolve(); });
  });
