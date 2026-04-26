export type PartnerType = 'teacher' | 'counselor' | 'scientist' | 'trainer';
export type Language = 'ja' | 'en' | 'th';

export interface ActionSuggestion {
  title: string;
  description: string;
  duration: string;
  partnerMessage: string;
  isOffline?: boolean;
}

export interface ScoreEntry {
  id?: string;
  score: number;
  timestamp: number;
  actionTitle?: string;
}

export interface AppState {
  isOnboardingComplete: boolean;
  selectedPartner: PartnerType | null;
  brainScore: number;
  language: Language;
  currentAction: ActionSuggestion | null;
  isActionLoading: boolean;
  notificationsEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  userId: string | null;
  scoreHistory: ScoreEntry[];
}

export type RootStackParamList = {
  Quiz: undefined;
  PartnerResult: { partner: PartnerType };
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Action: undefined;
  History: undefined;
  Settings: undefined;
};
