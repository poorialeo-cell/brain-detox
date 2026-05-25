import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import app, { auth } from '../config/firebase';
import { PartnerType, Language, ActionSuggestion, ScoreEntry } from '../types';
import { ActionDifficulty } from '../config/scoringConfig';
import { getActionBaseById, ActionBaseDefinition, ACTION_BASES } from '../data/actionBases';
import { buildOfflineActionFromBase, buildOfflineActionFromBaseSafe } from './buildOfflineAction';
import {
  buildOfflineActionPlanSteps,
  PLAN_TARGET_SECONDS,
} from './actionPlanService';

// ─── Firebase Functions プロキシ ─────────────────────────────────────────
const functions = getFunctions(app, 'asia-northeast1');
const _proxyCallable = httpsCallable<
  { messages: { role: string; content: string }[]; max_tokens?: number; temperature?: number; json_mode?: boolean },
  { content: string }
>(functions, 'openaiProxy');

/** Firebase Auth の復元を待ち、それでも未認証なら匿名サインインする */
async function waitForAuth(): Promise<void> {
  if (auth.currentUser) return;
  // onAuthStateChanged の初回発火（null or User）を待つ（最大 5 秒）
  await new Promise<void>((resolve) => {
    let unsub: (() => void) | null = null;
    const finish = () => {
      if (unsub) { unsub(); unsub = null; }
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, 5000);
    unsub = onAuthStateChanged(auth, () => finish());
  });
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      if (__DEV__) console.warn('[Auth] waitForAuth: 匿名サインイン失敗', e);
    }
  }
}

/**
 * Firebase Functions 経由で OpenAI を呼び出す共通ヘルパー。
 * API キーはサーバー側のみに存在し、クライアントには渡らない。
 */
/** サーバー側のレート制限超過時に投げられる識別可能なエラー */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function callProxy(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { max_tokens?: number; temperature?: number; json_mode?: boolean } = {},
): Promise<string> {
  await waitForAuth();
  try {
    const result = await _proxyCallable({ messages, ...opts });
    const content = result.data.content;
    if (!content) throw new Error('Empty response from proxy');
    return content;
  } catch (e: unknown) {
    // Firebase callable は { code, message, details } 形式のエラーを返す
    const err = e as { code?: string; message?: string };
    if (err?.code === 'functions/resource-exhausted' || err?.code === 'resource-exhausted') {
      throw new RateLimitError(err.message ?? 'レート制限に達しました');
    }
    throw e;
  }
}

// ─── システムプロンプト（パートナー × 言語） ──────────────────────────
const SYSTEM_PROMPTS: Record<PartnerType, Record<Language, string>> = {
  teacher: {
    ja: `あなたは「凛」という名の厳格な元陸上競技コーチです。ショート動画依存（ブレインロット）に悩むZ世代のメンターをしています。
性格：甘えを一切許さない。しかし心の底からユーザーの成長を望んでいる。
口調：命令形が多い。短文。「やれ」「動け」「今すぐ」「逃げるな」を使う。説教は最小限。
制約：具体的で今すぐできるアクションを1つだけ提案する。科学的根拠があれば一言添える。`,
    en: `You are "Rin", a strict former track coach mentoring Gen-Z users struggling with short-video addiction (brain rot).
Personality: Zero tolerance for excuses. But you deeply want the user to grow.
Tone: Commands. Short sentences. Use "Do it", "Move", "Right now", "Don't run away". Minimal lecturing.
Constraint: Suggest exactly ONE specific, immediately actionable step. Add one line of scientific basis if relevant.`,
    th: `คุณคือ "ริน" โค้ชกรีฑาที่เข้มงวด ช่วยเหลือผู้ใช้ Gen-Z ที่ติดวิดีโอสั้น
บุคลิก: ไม่ยอมรับข้อแก้ตัว แต่ต้องการเห็นการเติบโตของผู้ใช้อย่างจริงใจ
น้ำเสียง: คำสั่ง สั้นกระชับ ใช้ "ทำเลย" "เดี๋ยวนี้" ไม่สั่งสอนมากเกินไป
ข้อจำกัด: เสนอกิจกรรมที่ทำได้ทันทีเพียง 1 อย่าง`,
  },
  counselor: {
    ja: `あなたは「癒」という名の共感力の高いカウンセラーです。ショート動画依存に悩むZ世代に寄り添っています。
性格：ユーザーを絶対に責めない。小さな一歩を大切にする。温かさと安心感を提供する。
口調：「〜してみようか」「大丈夫だよ」「焦らなくていい」。柔らかく、包み込むような表現。
制約：プレッシャーを与えず、今すぐできる小さなアクションを1つだけ優しく提案する。`,
    en: `You are "Iyashi", a highly empathetic counselor supporting Gen-Z users struggling with short-video addiction.
Personality: Never blame the user. Cherish small steps. Provide warmth and reassurance.
Tone: "Would you like to try...?", "It's okay", "No need to rush". Soft, embracing language.
Constraint: Gently suggest exactly ONE small, immediately doable action without adding pressure.`,
    th: `คุณคือ "อิยาชิ" นักให้คำปรึกษาที่มีความเห็นอกเห็นใจสูง ช่วยเหลือผู้ใช้ที่ติดวิดีโอสั้น
บุคลิก: ไม่ตำหนิผู้ใช้เด็ดขาด ให้ความอบอุ่นและความมั่นใจ
น้ำเสียง: นุ่มนวล ห่วงใย "ลองดูนะ" "ไม่เป็นไร" "ค่อยๆ ไป"
ข้อจำกัด: เสนอกิจกรรมเล็กๆ ที่ทำได้ทันทีเพียง 1 อย่างโดยไม่กดดัน`,
  },
  scientist: {
    ja: `あなたは「理」という名の神経科学者です。ショート動画依存のメカニズムをデータで解明し、Z世代を支援しています。
性格：感情より論理。科学的根拠に基づいてのみアドバイスする。
口調：冷静。「研究によると」「神経科学的には」「ドーパミン」「前頭前野」「BDNF」などを適度に使う。
制約：科学的に効果が証明されたアクションを1つだけ提案する。なぜ効くかを一文で説明する。`,
    en: `You are "Ri", a neuroscientist who uses data to explain short-video addiction mechanisms to Gen-Z users.
Personality: Logic over emotion. Only advise based on scientific evidence.
Tone: Calm. Use "Research shows", "Neurologically speaking", "dopamine", "prefrontal cortex", "BDNF" appropriately.
Constraint: Suggest exactly ONE scientifically validated action and explain in one sentence why it works.`,
    th: `คุณคือ "ริ" นักประสาทวิทยาที่ใช้ข้อมูลอธิบายกลไกการติดวิดีโอสั้น
บุคลิก: ตรรกะมากกว่าอารมณ์ แนะนำตามหลักฐานทางวิทยาศาสตร์เท่านั้น
น้ำเสียง: สงบ ใช้ "การวิจัยแสดงให้เห็นว่า" "ทางประสาทวิทยา" "โดพามีน"
ข้อจำกัด: เสนอกิจกรรมที่มีหลักฐานทางวิทยาศาสตร์รองรับเพียง 1 อย่าง และอธิบายว่าทำไมมันได้ผล`,
  },
  trainer: {
    ja: `あなたは「剛」という名の熱血スポーツトレーナーです。ショート動画依存に打ち勝つ行動力をZ世代に叩き込んでいます。
性格：ポジティブ全開。行動こそ全て。身体を動かすことを最優先する。
口調：「よっしゃ！」「一緒に燃えよう！」「やれるぞ！」「今すぐ！」テンションMAX。
制約：身体を動かすか、エネルギーを解放するアクションを1つだけ提案する。テンション高めに。`,
    en: `You are "Go", a passionate sports trainer pumping Gen-Z users full of action-oriented energy to beat short-video addiction.
Personality: Maximum positivity. Action is everything. Physical movement is the top priority.
Tone: "Let's go!", "We're gonna burn together!", "You got this!", "Right now!" Maximum energy.
Constraint: Suggest exactly ONE physical or energy-releasing action. Keep the energy HIGH.`,
    th: `คุณคือ "โก" เทรนเนอร์กีฬาที่กระตือรือร้น ช่วยให้ผู้ใช้ Gen-Z มีพลังงานเพื่อเอาชนะการติดวิดีโอสั้น
บุคลิก: บวกสุดๆ การลงมือทำคือทุกอย่าง การเคลื่อนไหวร่างกายเป็นสิ่งสำคัญที่สุด
น้ำเสียง: "ไปเลย!" "เผาผลาญด้วยกัน!" "คุณทำได้!" พลังงานสูงสุด
ข้อจำกัด: เสนอกิจกรรมที่เกี่ยวกับร่างกายหรือการระบายพลังงานเพียง 1 อย่าง`,
  },
};

// ─── アクション履歴サマリー ─────────────────────────────────────────────
/**
 * scoreHistory の直近7日間のアクション記録を1行のサマリー文字列に変換する。
 * パートナーメッセージの文脈として OpenAI プロンプトに埋め込む。
 */
export function buildRecentActionSummary(history: ScoreEntry[], language: Language): string {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history
    .filter((e) => (e.kind === 'action' || !e.kind) && e.timestamp >= sevenDaysAgo)
    .slice(0, 12);

  if (recent.length === 0) {
    return language === 'ja'
      ? '直近7日間のアクション: なし（初回または長期ブランク）'
      : language === 'th'
        ? 'ไม่มีกิจกรรมใน 7 วันที่ผ่านมา (ครั้งแรกหรือหยุดนาน)'
        : 'No actions in the last 7 days (first time or long break)';
  }

  const count = recent.length;
  const avgGain = recent.reduce((s, e) => s + (e.scoreGain ?? 0), 0) / count;
  const titles = recent
    .slice(0, 3)
    .map((e) => e.actionTitle)
    .filter((t): t is string => !!t);

  const mid = Math.floor(recent.length / 2);
  const newerGain = mid > 0
    ? recent.slice(0, mid).reduce((s, e) => s + (e.scoreGain ?? 0), 0) / mid
    : avgGain;
  const olderGain = mid > 0
    ? recent.slice(mid).reduce((s, e) => s + (e.scoreGain ?? 0), 0) / (recent.length - mid)
    : avgGain;
  const trendJa = newerGain > olderGain + 0.5 ? '上昇中' : newerGain < olderGain - 0.5 ? '下降中' : '安定';
  const trendEn = newerGain > olderGain + 0.5 ? 'improving' : newerGain < olderGain - 0.5 ? 'declining' : 'stable';

  if (language === 'ja') {
    return `直近7日: ${count}回完了, 平均+${avgGain.toFixed(1)}pt, 傾向=${trendJa}${titles.length ? `, 最近="${titles.join('・')}"` : ''}`;
  }
  if (language === 'th') {
    return `7 วันล่าสุด: ${count} ครั้ง, เฉลี่ย+${avgGain.toFixed(1)}pt, แนวโน้ม=${trendEn}${titles.length ? `, ล่าสุด="${titles.join(', ')}"` : ''}`;
  }
  return `Last 7 days: ${count} done, avg +${avgGain.toFixed(1)}pt, trend=${trendEn}${titles.length ? `, recent="${titles.join(', ')}"` : ''}`;
}

// ─── アクション素の肉付け（OpenAI） ────────────────────────────────────
export interface GenerateActionFromBaseParams {
  baseId: string;
  partner: PartnerType;
  brainScore: number;
  language: Language;
  /** scoreHistory から生成した直近の行動サマリー（省略可） */
  recentActionSummary?: string;
}

export async function generateActionFromBase(params: GenerateActionFromBaseParams): Promise<ActionSuggestion> {
  const base = getActionBaseById(params.baseId);
  if (!base) throw new Error(`Unknown action base: ${params.baseId}`);

  const systemPrompt = SYSTEM_PROMPTS[params.partner][params.language];
  const userMessage = buildAdaptBaseUserMessage(params, base);

  let content: string;
  try {
    content = await callProxy(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      { max_tokens: 420, temperature: 0.88, json_mode: true },
    );
  } catch (err) {
    if (__DEV__) console.error('[openAIProxy] generateActionFromBase failed:', err);
    return buildOfflineActionFromBase(params.baseId, params.partner, params.language);
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;

  const difficulty: ActionDifficulty = ['easy', 'medium', 'hard'].includes(String(parsed.difficulty))
    ? (parsed.difficulty as ActionDifficulty)
    : base.defaultDifficulty;

  const mustType = base.interactiveType;

  const breathingConfig =
    mustType === 'breathing' && parsed.breathingConfig && typeof parsed.breathingConfig === 'object'
      ? {
          inhaleSeconds: Number((parsed.breathingConfig as { inhaleSeconds?: number }).inhaleSeconds ?? base.defaultBreathing?.inhaleSeconds ?? 4),
          holdSeconds: Number((parsed.breathingConfig as { holdSeconds?: number }).holdSeconds ?? base.defaultBreathing?.holdSeconds ?? 0),
          exhaleSeconds: Number((parsed.breathingConfig as { exhaleSeconds?: number }).exhaleSeconds ?? base.defaultBreathing?.exhaleSeconds ?? 6),
          cycles: Number((parsed.breathingConfig as { cycles?: number }).cycles ?? base.defaultBreathing?.cycles ?? 5),
        }
      : mustType === 'breathing' && base.defaultBreathing
        ? { ...base.defaultBreathing }
        : undefined;

  const timerSec =
    mustType === 'timer' && typeof parsed.timerDurationSeconds === 'number'
      ? Math.max(15, Math.min(3600, parsed.timerDurationSeconds))
      : mustType === 'timer'
        ? base.defaultTimerSeconds ?? base.nominalSeconds
        : undefined;

  let brainImpact = Number(parsed.brainImpact);
  if (!Number.isFinite(brainImpact)) brainImpact = base.brainImpact;
  brainImpact = Math.min(5, Math.max(1, Math.round(brainImpact)));

  let nominalDurationSeconds = base.nominalSeconds;
  if (mustType === 'timer' && timerSec) nominalDurationSeconds = timerSec;
  if (mustType === 'breathing' && breathingConfig) {
    nominalDurationSeconds =
      (breathingConfig.inhaleSeconds + breathingConfig.holdSeconds + breathingConfig.exhaleSeconds) *
      breathingConfig.cycles;
  }

  return {
    baseId: base.id,
    brainImpact,
    nominalDurationSeconds,
    title: typeof parsed.title === 'string' ? parsed.title.slice(0, 40) : base.titleHint[params.language],
    description: typeof parsed.description === 'string' ? parsed.description : base.neutralCore[params.language],
    duration: typeof parsed.duration === 'string' ? parsed.duration : String(parsed.duration ?? ''),
    partnerMessage: typeof parsed.partnerMessage === 'string' ? parsed.partnerMessage : '',
    difficulty,
    interactiveType: mustType,
    breathingConfig,
    timerConfig: mustType === 'timer' && timerSec ? { durationSeconds: timerSec } : undefined,
    isOffline: false,
  };
}

function buildAdaptBaseUserMessage(params: GenerateActionFromBaseParams, base: ActionBaseDefinition): string {
  const langLabel: Record<Language, string> = { ja: '日本語', en: 'English', th: 'ภาษาไทย' };
  const difficultyHint =
    params.brainScore >= 70 ? 'medium または hard を推奨' :
    params.brainScore >= 40 ? 'easy または medium を推奨' :
    'easy を推奨';

  const core = base.neutralCore[params.language] ?? base.neutralCore.ja;

  const historyLine = params.recentActionSummary
    ? `\nユーザーのアクション履歴: ${params.recentActionSummary}`
    : '';

  return `【重要】次の「アクション素」を必ず守ってください（ユーザー向けの文章に反映すること）。
- baseId: "${base.id}"
- interactiveType は "${base.interactiveType}" のみ。別のタイプに変更してはいけません。
- 中立的な内容の骨子:
${core}
- 素の目安所要秒: ${base.nominalSeconds}

ユーザーのブレインスコア: ${params.brainScore}/100（${getScoreLabel(params.brainScore)}）
難易度の目安: ${difficultyHint}${historyLine}
出力言語: ${langLabel[params.language]}

あなたの仕事: 上記の素を、あなたのキャラクター口調で言い換え、タイトル・手順説明・パートナーの一言・表示用の所要時間・難易度・脳への影響度を設定すること。
partnerMessage はブレインスコアとアクション履歴（継続・初回・ブランク・傾向）を踏まえてパーソナライズされた一言にすること。
brainImpact は 1（ごく軽い）〜5（強い回復・集中の切り替えが大きい）の整数で、素の内容を踏まえて客観的に決めてください。

次のJSONのみを返してください:
{
  "title": "20文字以内目安",
  "description": "具体的な手順 80〜150文字",
  "duration": "所要時間の表示用文字列（例: 2分）",
  "difficulty": "easy | medium | hard",
  "partnerMessage": "パートナーらしい一言 20〜50文字",
  "brainImpact": 1,
  "breathingConfig": { "inhaleSeconds": 4, "holdSeconds": 0, "exhaleSeconds": 6, "cycles": 5 },
  "timerDurationSeconds": 120
}
interactiveType が breathing のときだけ breathingConfig を含め、timer のときだけ timerDurationSeconds（秒）を含め、none のときは両方省略。`;
}

function getScoreLabel(score: number): string {
  if (score >= 91) return '非常に良好';
  if (score >= 71) return '良好';
  if (score >= 41) return '普通';
  if (score >= 21) return '注意';
  return '緊急';
}

export function getBrainScoreLabel(score: number, language: Language): string {
  if (language === 'en') {
    if (score >= 91) return 'Excellent';
    if (score >= 71) return 'Good';
    if (score >= 41) return 'Moderate';
    if (score >= 21) return 'Caution';
    return 'Critical';
  }
  if (language === 'th') {
    if (score >= 91) return 'ยอดเยี่ยม';
    if (score >= 71) return 'ดี';
    if (score >= 41) return 'ปานกลาง';
    if (score >= 21) return 'ระวัง';
    return 'วิกฤต';
  }
  return getScoreLabel(score);
}

function buildHomeSystemPrompt(partner: PartnerType, language: Language): string {
  const role = SYSTEM_PROMPTS[partner][language];
  const langLabel: Record<Language, string> = { ja: '日本語', en: 'English', th: 'ภาษาไทย' };
  return `${role}

【追加ルール・ホーム画面専用】
- 返答は厳密に1つのJSONオブジェクトのみ: {"message":"..."}
- "message"にはホーム画面の吹き出し用の短いセリフだけを書く（1〜3文）。
- アクションの具体的手順・タイトル・チェックリストは書かない（別タブで提案される）。
- ユーザーのブレインスコアの状態に言及しつつ、上記のキャラクター口調を必ず守る。
- 出力言語は${langLabel[language]}のみ。`;
}

export interface GenerateHomeMessageParams {
  partner: PartnerType;
  brainScore: number;
  language: Language;
}

export async function generateHomePartnerMessage(params: GenerateHomeMessageParams): Promise<string> {
  const systemPrompt = buildHomeSystemPrompt(params.partner, params.language);
  const band = getBrainScoreLabel(params.brainScore, params.language);
  const userMessage =
    params.language === 'ja'
      ? `現在のブレインスコア: ${params.brainScore}/100（傾向: ${band}）。この状態に合ったホーム用メッセージを生成してください。`
      : params.language === 'th'
        ? `คะแนนสมองปัจจุบัน: ${params.brainScore}/100 (ภาพรวม: ${band}). สร้างข้อความต้อนรับหน้าแรกให้สอดคล้อง.`
        : `Current brain score: ${params.brainScore}/100 (status: ${band}). Generate the home-screen message accordingly.`;

  const content = await callProxy(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ],
    { max_tokens: 220, temperature: 0.88, json_mode: true },
  );

  const parsed = JSON.parse(content) as { message?: string };
  const msg = typeof parsed.message === 'string' ? parsed.message.trim() : '';
  if (!msg) throw new Error('Empty message');
  return msg;
}

const PLAN_DURATION_LO = PLAN_TARGET_SECONDS - 420;
const PLAN_DURATION_HI = PLAN_TARGET_SECONDS + 420;

export interface GenerateActionPlanFromTestParams {
  baseA: number;
  provisionalB: number;
  partner: PartnerType;
  language: Language;
  /** アクション履歴（partnerMessage のパーソナライズに使用） */
  scoreHistory?: ScoreEntry[];
}

/** テスト結果 B（と A）に基づき、約30分の複数ステッププランを生成 */
export async function generateActionPlanFromTestScores(
  params: GenerateActionPlanFromTestParams,
): Promise<ActionSuggestion[]> {
  const offline = () => buildOfflineActionPlanSteps(params.baseA, params.provisionalB, params.partner, params.language);
  const recentActionSummary = params.scoreHistory
    ? buildRecentActionSummary(params.scoreHistory, params.language)
    : undefined;

  const catalog = ACTION_BASES.map(
    (b) => `${b.id}\tnominal_sec=${b.nominalSeconds}\ttype=${b.interactiveType}\timpact=${b.brainImpact}`,
  ).join('\n');

  const band = getBrainScoreLabel(params.provisionalB, params.language);
  const userMessage =
    params.language === 'ja'
      ? `テスト直前スコア A=${params.baseA}、テスト後暫定 B=${params.provisionalB}（傾向: ${band}）。
カタログの baseId **だけ**を使い、**4〜10個**を**実行順**に並べる。
Bが低い・A−Bが大きいときは、脳の切り替え・回復に効くステップを優先し、できるだけ種類（timer/breathing）を分散させる。

カタログ（タブ区切り）:
${catalog}

JSON のみ: {"ordered_base_ids":["id1","id2",...]}`
      : params.language === 'th'
        ? `A=${params.baseA}, B=${params.provisionalB} (${band}). Use ONLY baseIds from catalog. Pick 4-10 steps in order. When B is low or A−B is large, prefer recovery steps. Vary types (timer/breathing).
Catalog:
${catalog}
JSON only: {"ordered_base_ids":["..."]}`
        : `A=${params.baseA} (before test), B=${params.provisionalB} after test (${band}).
Use ONLY baseIds from catalog. Pick **4-10** steps in order. When B is low or A−B is large, prefer recovery-focused steps. Vary activity types (timer/breathing).

Catalog:
${catalog}
JSON only: {"ordered_base_ids":["id1",...]}`;

  const systemPrompt =
    'You output ONLY valid JSON: {"ordered_base_ids": string[]}. Each string must exactly match a baseId from the catalog. No other keys.';

  try {
    const content = await callProxy(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      { max_tokens: 420, temperature: 0.55, json_mode: true },
    );
    const parsed = JSON.parse(content) as { ordered_base_ids?: unknown };
    const raw = parsed.ordered_base_ids;
    if (!Array.isArray(raw) || raw.length < 2) return offline();
    const validated: string[] = [];
    for (const id of raw) {
      if (typeof id !== 'string') continue;
      if (getActionBaseById(id)) validated.push(id);
    }
    if (validated.length < 2) return offline();
    // カタログ全体の合計が1590秒しかないため、アイテム数による合計チェックは行わない
    // （「4-7個で1380-2220秒」という矛盾した制約が原因でオフラインになるのを防ぐ）

    const steps: ActionSuggestion[] = [];
    for (const id of validated) {
      try {
        steps.push(
          await generateActionFromBase({
            baseId: id,
            partner: params.partner,
            brainScore: params.provisionalB,
            language: params.language,
            recentActionSummary,
          }),
        );
      } catch {
        steps.push(buildOfflineActionFromBaseSafe(id, params.partner, params.language));
      }
    }
    return steps;
  } catch {
    return offline();
  }
}
