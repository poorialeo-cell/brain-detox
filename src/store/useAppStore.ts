import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PartnerType, Language, ActionSuggestion, ScoreEntry } from '../types';
import { generateAction, getRandomFallback } from '../services/openAIService';
import { checkAndIntervene } from '../services/notificationService';
import { saveUserProfile, saveScoreEntry } from '../services/firestoreService';

interface AppStore extends AppState {
  setOnboardingComplete: (value: boolean) => void;
  setSelectedPartner: (partner: PartnerType) => void;
  setBrainScore: (score: number, actionTitle?: string) => void;
  setLanguage: (lang: Language) => void;
  setUserId: (id: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  fetchAction: () => Promise<void>;
  completeAction: () => void;
  skipAction: () => void;
  syncProfile: () => Promise<void>;
  resetAll: () => void;
}

const initialState: AppState = {
  isOnboardingComplete: false,
  selectedPartner: null,
  brainScore: 50,
  language: 'ja',
  currentAction: null,
  isActionLoading: false,
  notificationsEnabled: false,
  reminderHour: 21,
  reminderMinute: 0,
  userId: null,
  scoreHistory: [],
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
      setSelectedPartner: (partner) => set({ selectedPartner: partner }),

      setBrainScore: (score, actionTitle) => {
        const clamped = Math.min(100, Math.max(0, score));
        const { selectedPartner, notificationsEnabled, userId, scoreHistory } = get();

        const entry: ScoreEntry = { score: clamped, timestamp: Date.now(), actionTitle };
        set({ brainScore: clamped, scoreHistory: [entry, ...scoreHistory].slice(0, 60) });

        // Firestore に保存
        if (userId) {
          saveScoreEntry(userId, entry).catch(() => {});
        }

        checkAndIntervene(clamped, selectedPartner ?? 'counselor', notificationsEnabled);
      },

      setLanguage: (lang) => set({ language: lang }),
      setUserId: (id) => set({ userId: id }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setReminderTime: (hour, minute) => set({ reminderHour: hour, reminderMinute: minute }),

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

      completeAction: () => {
        const { brainScore, currentAction } = get();
        get().setBrainScore(Math.min(100, brainScore + 5), currentAction?.title);
        set({ currentAction: null });
      },

      skipAction: () => set({ currentAction: null }),

      // プロフィールを Firestore に同期
      syncProfile: async () => {
        const { userId, selectedPartner, brainScore, language } = get();
        if (!userId || !selectedPartner) return;
        await saveUserProfile(userId, {
          partner: selectedPartner,
          brainScore,
          language,
        }).catch(() => {});
      },

      resetAll: () => {
        // userIdだけ保持してリセット（再認証のため）
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
        brainScore: state.brainScore,
        language: state.language,
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
