import { ActionSuggestion } from '../types';

export function getNominalDurationSeconds(action: ActionSuggestion): number {
  if (typeof action.nominalDurationSeconds === 'number' && action.nominalDurationSeconds > 0) {
    return action.nominalDurationSeconds;
  }
  if (action.interactiveType === 'timer' && action.timerConfig) {
    return action.timerConfig.durationSeconds;
  }
  if (action.interactiveType === 'breathing' && action.breathingConfig) {
    const b = action.breathingConfig;
    return (b.inhaleSeconds + b.holdSeconds + b.exhaleSeconds) * b.cycles;
  }
  if (action.difficulty === 'hard') return 600;
  if (action.difficulty === 'easy') return 120;
  return 240;
}
