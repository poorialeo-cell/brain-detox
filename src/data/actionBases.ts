import { InteractiveType, Language } from '../types';
import { ActionDifficulty } from '../config/scoringConfig';

/** アクションの素（レパートリー）。AI はこれを口調・難易度・文言で肉付けする */
export interface ActionBaseDefinition {
  id: string;
  interactiveType: InteractiveType;
  nominalSeconds: number;
  /** オフライン／フォールバック用の脳への影響度 1〜5 */
  brainImpact: number;
  defaultDifficulty: ActionDifficulty;
  defaultTimerSeconds?: number;
  defaultBreathing?: {
    inhaleSeconds: number;
    holdSeconds: number;
    exhaleSeconds: number;
    cycles: number;
  };
  /** AI に渡す中立的な説明（言語別） */
  neutralCore: Record<Language, string>;
  /** オフライン時の短いタイトル */
  titleHint: Record<Language, string>;
}

export const ACTION_BASES: ActionBaseDefinition[] = [
  {
    id: 'cold_water_face',
    interactiveType: 'timer',
    nominalSeconds: 90,
    brainImpact: 3,
    defaultDifficulty: 'easy',
    defaultTimerSeconds: 90,
    neutralCore: {
      ja: '冷水で顔を洗い、交感神経を刺激して覚醒を高める。洗面所で短時間でできる。',
      en: 'Splash cold water on your face to boost alertness via sympathetic activation. Quick bathroom routine.',
      th: 'ล้างหน้าด้วยน้ำเย็นเพื่อกระตุ้นความตื่นตัว',
    },
    titleHint: { ja: '冷水洗顔', en: 'Cold water splash', th: 'ล้างหน้าน้ำเย็น' },
  },
  {
    id: 'box_breathing',
    interactiveType: 'breathing',
    nominalSeconds: 180,
    brainImpact: 4,
    defaultDifficulty: 'easy',
    defaultBreathing: { inhaleSeconds: 4, holdSeconds: 4, exhaleSeconds: 4, cycles: 5 },
    neutralCore: {
      ja: '4秒吸う・4秒止める・4秒吐くのボックス呼吸で副交感神経を優位にする。',
      en: 'Box breathing: 4s in, 4s hold, 4s out for several cycles to calm the nervous system.',
      th: 'หายใจแบบบ็อกซ์ 4-4-4 เพื่อให้ระบบประสาทสงบ',
    },
    titleHint: { ja: 'ボックス呼吸', en: 'Box breathing', th: 'หายใจบ็อกซ์' },
  },
  {
    id: 'short_walk',
    interactiveType: 'timer',
    nominalSeconds: 300,
    brainImpact: 4,
    defaultDifficulty: 'medium',
    defaultTimerSeconds: 300,
    neutralCore: {
      ja: '屋内または外を5分程度歩き、視界と身体のリズムを変える軽い有酸素。',
      en: 'Walk briskly for about 5 minutes indoors or outdoors to reset attention.',
      th: 'เดินเร็วๆ ประมาณ 5 นาที เพื่อรีเซ็ตสมาธิ',
    },
    titleHint: { ja: '短いウォーキング', en: 'Short walk', th: 'เดินเร็วสั้นๆ' },
  },
  {
    id: 'micro_read',
    interactiveType: 'timer',
    nominalSeconds: 300,
    brainImpact: 3,
    defaultDifficulty: 'medium',
    defaultTimerSeconds: 300,
    neutralCore: {
      ja: '活字を5分だけ読む。スクリーン以外の注意先を作る。',
      en: 'Read printed or long-form text for 5 minutes—off short-form video patterns.',
      th: 'อ่านหนังสือหรือบทความยาว 5 นาที',
    },
    titleHint: { ja: '5分読書', en: '5-min reading', th: 'อ่าน 5 นาที' },
  },
  {
    id: 'squat_burst',
    interactiveType: 'none',
    nominalSeconds: 120,
    brainImpact: 3,
    defaultDifficulty: 'easy',
    neutralCore: {
      ja: 'その場で軽いスクワットや屈伸を短時間繰り返し、血流を改善する。',
      en: 'Do a short set of squats or chair stand-ups to increase blood flow.',
      th: 'สควอทหรือลุกนั่งย่อสั้นๆ เพื่อเร่งการไหลเวียนโลหิต',
    },
    titleHint: { ja: '軽いスクワット', en: 'Light squats', th: 'สควอทเบาๆ' },
  },
  {
    id: 'twenty_twenty_twenty',
    interactiveType: 'timer',
    nominalSeconds: 60,
    brainImpact: 2,
    defaultDifficulty: 'easy',
    defaultTimerSeconds: 60,
    neutralCore: {
      ja: '画面から目を離し、6m先を20秒見る20-20-20の目の休憩。',
      en: '20-20-20 eye rest: look ~20 feet away for 20 seconds, repeat a few times.',
      th: 'พักสายตา 20-20-20',
    },
    titleHint: { ja: '20-20-20 目の休憩', en: '20-20-20 eyes', th: 'พักตา 20-20-20' },
  },
  {
    id: 'one_line_journal',
    interactiveType: 'timer',
    nominalSeconds: 180,
    brainImpact: 2,
    defaultDifficulty: 'easy',
    defaultTimerSeconds: 180,
    neutralCore: {
      ja: '今の気分や体調を一行だけ紙やメモに書くメタ認知のきっかけ。',
      en: 'Write exactly one line about how you feel—builds metacognition.',
      th: 'เขียนหนึ่งบรรทัดเกี่ยวกับอารมณ์ตอนนี้',
    },
    titleHint: { ja: '一行日記', en: 'One-line journal', th: 'ไดอารี่บรรทัดเดียว' },
  },
  {
    id: 'ambient_reset',
    interactiveType: 'breathing',
    nominalSeconds: 120,
    brainImpact: 3,
    defaultDifficulty: 'easy',
    defaultBreathing: { inhaleSeconds: 3, holdSeconds: 0, exhaleSeconds: 5, cycles: 4 },
    neutralCore: {
      ja: '周囲の音をいくつか意識的に聴き分けながら、ゆっくり呼吸する。',
      en: 'Notice a few distinct sounds around you while breathing slowly.',
      th: 'ฟังเสียงรอบตัวอย่างมีสติ พร้อมหายใจช้าๆ',
    },
    titleHint: { ja: '音に気づく呼吸', en: 'Sound-aware breath', th: 'หายใจฟังเสียง' },
  },
  {
    id: 'desk_stretch',
    interactiveType: 'timer',
    nominalSeconds: 120,
    brainImpact: 2,
    defaultDifficulty: 'easy',
    defaultTimerSeconds: 120,
    neutralCore: {
      ja: '首・肩・背中をゆっくり回すデスクストレッチ。',
      en: 'Gentle neck, shoulder, and upper back stretches at your desk.',
      th: 'ยืดคอ ไหล่ หลังส่วนบนช้าๆ',
    },
    titleHint: { ja: 'デスクストレッチ', en: 'Desk stretch', th: 'ยืดที่โต๊ะ' },
  },
  {
    id: 'water_break',
    interactiveType: 'timer',
    nominalSeconds: 120,
    brainImpact: 2,
    defaultDifficulty: 'easy',
    defaultTimerSeconds: 120,
    neutralCore: {
      ja: 'コップ1杯の水をゆっくり飲み、一点に注意を向ける。',
      en: 'Slowly drink a glass of water with full attention.',
      th: 'ดื่มน้ำทีละอึกอย่างตั้งใจหนึ่งแก้ว',
    },
    titleHint: { ja: '水をゆっくり飲む', en: 'Mindful water', th: 'ดื่มน้ำอย่างตั้งใจ' },
  },
];

export function getActionBaseById(id: string): ActionBaseDefinition | undefined {
  return ACTION_BASES.find((b) => b.id === id);
}

export function getAllActionBaseIds(): string[] {
  return ACTION_BASES.map((b) => b.id);
}
