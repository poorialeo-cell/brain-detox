import { PartnerType, Language, ActionSuggestion } from '../types';
import { getActionBaseById } from '../data/actionBases';

const PARTNER_LINE: Record<PartnerType, Record<Language, string>> = {
  teacher: {
    ja: '今すぐ始めろ。言い訳はいらない。',
    en: 'Start now. No excuses.',
    th: 'เริ่มเลย ไม่มีข้อแก้ตัว',
  },
  counselor: {
    ja: '大丈夫、あなたのペースで進めていいよ。',
    en: "It's okay—go at your own pace.",
    th: 'ไม่เป็นไร ทำตามจังหวัดคุณได้เลย',
  },
  scientist: {
    ja: '手順はシンプル。効果はエビデンスと一致する。',
    en: 'Simple steps; effects align with the literature.',
    th: 'ขั้นตอนเรียบง่าย สอดคล้องหลักฐาน',
  },
  trainer: {
    ja: 'よっしゃ、その一歩で脳をアップデートだ！',
    en: 'Yes! That one move upgrades your brain!',
    th: 'ไปเลย สเต็ปนี้คือพลัง!',
  },
};

function formatDuration(seconds: number, language: Language): string {
  const m = Math.max(1, Math.round(seconds / 60));
  if (language === 'en') return m >= 2 ? `${m} min` : `${seconds} sec`;
  if (language === 'th') return m >= 2 ? `${m} นาที` : `${seconds} วินาที`;
  return m >= 2 ? `${m}分` : `${seconds}秒`;
}

export function buildOfflineActionFromBase(
  baseId: string,
  partner: PartnerType,
  language: Language,
): ActionSuggestion {
  const base = getActionBaseById(baseId);
  if (!base) throw new Error(`Unknown action base: ${baseId}`);

  const title = base.titleHint[language] ?? base.titleHint.ja;
  const description = base.neutralCore[language] ?? base.neutralCore.ja;
  const partnerMessage = PARTNER_LINE[partner][language] ?? PARTNER_LINE[partner].ja;

  let nominalSeconds = base.nominalSeconds;
  if (base.interactiveType === 'timer' && base.defaultTimerSeconds) {
    nominalSeconds = base.defaultTimerSeconds;
  }
  if (base.interactiveType === 'breathing' && base.defaultBreathing) {
    const b = base.defaultBreathing;
    nominalSeconds = (b.inhaleSeconds + b.holdSeconds + b.exhaleSeconds) * b.cycles;
  }
  const duration = formatDuration(nominalSeconds, language);

  const suggestion: ActionSuggestion = {
    baseId: base.id,
    brainImpact: base.brainImpact,
    nominalDurationSeconds: nominalSeconds,
    title,
    description,
    duration,
    partnerMessage,
    difficulty: base.defaultDifficulty,
    interactiveType: base.interactiveType,
    isOffline: true,
  };

  if (base.interactiveType === 'breathing' && base.defaultBreathing) {
    suggestion.breathingConfig = { ...base.defaultBreathing };
  }
  if (base.interactiveType === 'timer' && base.defaultTimerSeconds) {
    suggestion.timerConfig = { durationSeconds: base.defaultTimerSeconds };
  }

  return suggestion;
}

export function buildOfflineActionFromBaseSafe(
  baseId: string,
  partner: PartnerType,
  language: Language,
): ActionSuggestion {
  try {
    return buildOfflineActionFromBase(baseId, partner, language);
  } catch {
    return buildOfflineActionFromBase('water_break', partner, language);
  }
}
