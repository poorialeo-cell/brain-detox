import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PartnerType, Language, ActionSuggestion } from '../types';
import { generateAction, getRandomFallback } from '../services/openAIService';

interface AppStore extends AppState {
  setOnboardingComplete: (value: boolean) => void;
  setSelectedPartner: (partner: PartnerType) => void;
  setBrainScore: (score: number) => void;
  setLanguage: (lang: Language) => void;
  fetchAction: () => Promise<void>;
  completeAction: () => void;
  skipAction: () => void;
  resetAll: () => void;
}

const initialState: AppState = {
  isOnboardingComplete: false,
  selectedPartner: null,
  brainScore: 50,
  language: 'ja',
  currentAction: null,
  isActionLoading: false,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
      setSelectedPartner: (partner) => set({ selectedPartner: partner }),
      setBrainScore: (score) => set({ brainScore: Math.min(100, Math.max(0, score)) }),
      setLanguage: (lang) => set({ language: lang }),

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
        const { brainScore } = get();
        set({ brainScore: Math.min(100, brainScore + 5), currentAction: null });
      },

      skipAction: () => set({ currentAction: null }),

      resetAll: () => set(initialState),
    }),
    {
      name: 'brain-detox-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // 永続化する項目だけ指定（ローディング状態などは除外）
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        selectedPartner: state.selectedPartner,
        brainScore: state.brainScore,
        language: state.language,
      }),
    }
  )
);

// App.tsxでハイドレーション完了を待つためのヘルパー
export const waitForHydration = () =>
  new Promise<void>((resolve) => {
    if (useAppStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useAppStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
