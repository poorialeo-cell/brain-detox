import { PartnerType, Language, ActionSuggestion, InteractiveType } from '../types';
import { ActionDifficulty } from '../config/scoringConfig';

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

// ─── オフライン用フォールバックアクション ─────────────────────────────
const FALLBACK_ACTIONS: Record<PartnerType, Record<Language, ActionSuggestion[]>> = {
  teacher: {
    ja: [
      { title: '即席スクワット', description: '今すぐ椅子から立ち、20回スクワットをしろ。身体を動かせば脳が覚醒する。', duration: '2分', difficulty: 'easy' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: '言い訳は聞かない。今すぐやれ。', isOffline: true },
      { title: '冷水洗顔', description: '洗面所へ行き、冷水で顔を3回洗え。前頭前野を物理的に刺激する最速の方法だ。', duration: '1分', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 60 }, partnerMessage: '逃げるな。身体に喝を入れろ。', isOffline: true },
      { title: '5分読書', description: '本を1冊手に取り、5分間だけ読め。それだけでいい。集中力の筋肉を今すぐ鍛えろ。', duration: '5分', difficulty: 'medium' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 300 }, partnerMessage: 'ショート動画の代わりに活字を入れろ。', isOffline: true },
    ],
    en: [
      { title: 'Drop & Squat', description: 'Stand up right now and do 20 squats.', duration: '2 min', difficulty: 'easy' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: "No excuses. Do it now.", isOffline: true },
      { title: 'Cold Water Face Wash', description: 'Go to the sink and wash your face with cold water 3 times.', duration: '1 min', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 60 }, partnerMessage: "Don't run. Wake your body up.", isOffline: true },
      { title: '5-Min Reading', description: 'Pick up a book and read for just 5 minutes.', duration: '5 min', difficulty: 'medium' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 300 }, partnerMessage: 'Replace short videos with words.', isOffline: true },
    ],
    th: [
      { title: 'สควอท 20 ครั้ง', description: 'ลุกขึ้นยืนทันทีแล้วทำสควอท 20 ครั้ง', duration: '2 นาที', difficulty: 'easy' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: 'ไม่มีข้อแก้ตัว ทำเดี๋ยวนี้', isOffline: true },
    ],
  },
  counselor: {
    ja: [
      { title: '4-8呼吸法', description: '目を閉じて、鼻から4秒吸って8秒かけて吐く。これを5回繰り返してみよう。ゆっくりでいい。', duration: '3分', difficulty: 'easy' as ActionDifficulty, interactiveType: 'breathing' as InteractiveType, breathingConfig: { inhaleSeconds: 4, holdSeconds: 0, exhaleSeconds: 8, cycles: 5 }, partnerMessage: '焦らなくていい。まず息を整えよう。', isOffline: true },
      { title: '一行日記', description: '今日感じたことを一行だけ書いてみよう。「疲れた」でも「楽しかった」でもいい。自分を知る第一歩。', duration: '3分', difficulty: 'easy' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: '小さな一歩でいい。あなたのペースで。', isOffline: true },
      { title: '温かい飲み物タイム', description: '温かいお茶やコーヒーをゆっくり淹れて飲もう。五感に意識を向けると脳がリセットされるよ。', duration: '5分', difficulty: 'medium' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 300 }, partnerMessage: '自分を大切にすることも立派な回復だよ。', isOffline: true },
    ],
    en: [
      { title: '4-8 Breathing', description: "Close your eyes and breathe in for 4 seconds, out for 8. Try it 5 times.", duration: '3 min', difficulty: 'easy' as ActionDifficulty, interactiveType: 'breathing' as InteractiveType, breathingConfig: { inhaleSeconds: 4, holdSeconds: 0, exhaleSeconds: 8, cycles: 5 }, partnerMessage: "No rush. Let's calm your breathing first.", isOffline: true },
      { title: 'One-Line Journal', description: "Write just one line about how you're feeling today.", duration: '3 min', difficulty: 'easy' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: "One small step is enough. At your own pace.", isOffline: true },
      { title: 'Warm Drink Moment', description: 'Make a warm tea or coffee and drink it slowly.', duration: '5 min', difficulty: 'medium' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 300 }, partnerMessage: 'Taking care of yourself is real recovery too.', isOffline: true },
    ],
    th: [
      { title: 'หายใจ 4-8', description: 'หลับตาแล้วหายใจเข้า 4 วินาที ออก 8 วินาที ทำ 5 ครั้ง', duration: '3 นาที', difficulty: 'easy' as ActionDifficulty, interactiveType: 'breathing' as InteractiveType, breathingConfig: { inhaleSeconds: 4, holdSeconds: 0, exhaleSeconds: 8, cycles: 5 }, partnerMessage: 'ไม่ต้องรีบ มาจัดการลมหายใจก่อนนะ', isOffline: true },
    ],
  },
  scientist: {
    ja: [
      { title: '20-20-20ルール', description: 'スクリーンから目を離し、6m先を20秒間見よ。視覚野の疲労を軽減し、注意力が回復する（米眼科学会推奨）。', duration: '1分', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 20 }, partnerMessage: '神経科学的に証明された手法だ。実行せよ。', isOffline: true },
      { title: '10分ウォーキング', description: '10分間の早歩きを実施せよ。有酸素運動はBDNF（脳由来神経栄養因子）を増加させ、依存の衝動を抑制する。', duration: '10分', difficulty: 'hard' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 600 }, partnerMessage: 'データは明確だ。運動がドーパミン系を整える。', isOffline: true },
      { title: '5感マインドフルネス', description: '周囲の音を5つ特定し、各々に3秒意識を向けよ。デフォルトモードネットワークをリセットする効果がある。', duration: '3分', difficulty: 'medium' as ActionDifficulty, interactiveType: 'breathing' as InteractiveType, breathingConfig: { inhaleSeconds: 3, holdSeconds: 0, exhaleSeconds: 3, cycles: 5 }, partnerMessage: '前頭前野の活性化を促す。今すぐ実行。', isOffline: true },
    ],
    en: [
      { title: '20-20-20 Rule', description: 'Look away from screens at something 20 feet away for 20 seconds.', duration: '1 min', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 20 }, partnerMessage: 'Scientifically validated. Execute it.', isOffline: true },
      { title: '10-Min Walk', description: 'Walk briskly for 10 minutes. Aerobic exercise increases BDNF and suppresses addictive impulses.', duration: '10 min', difficulty: 'hard' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 600 }, partnerMessage: 'The data is clear. Exercise regulates dopamine.', isOffline: true },
      { title: '5-Sense Mindfulness', description: 'Identify 5 sounds around you and focus on each for 3 seconds.', duration: '3 min', difficulty: 'medium' as ActionDifficulty, interactiveType: 'breathing' as InteractiveType, breathingConfig: { inhaleSeconds: 3, holdSeconds: 0, exhaleSeconds: 3, cycles: 5 }, partnerMessage: 'Activates prefrontal cortex. Do it now.', isOffline: true },
    ],
    th: [
      { title: 'กฎ 20-20-20', description: 'มองออกไป 6 เมตร เป็นเวลา 20 วินาที', duration: '1 นาที', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 20 }, partnerMessage: 'มีการพิสูจน์ทางวิทยาศาสตร์แล้ว ปฏิบัติได้เลย', isOffline: true },
    ],
  },
  trainer: {
    ja: [
      { title: 'バーピー10回', description: '今すぐバーピー10回！腕立て伏せ→立ち上がり→ジャンプ。心拍数を一気に上げてドーパミンを叩き出せ！', duration: '2分', difficulty: 'medium' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: 'よっしゃ！一緒に燃えよう！やれるぞ！', isOffline: true },
      { title: '外に飛び出せ', description: '靴を履いて外に出ろ！5分間でいい。太陽光でセロトニンをチャージだ！スマホは部屋に置いていけ！', duration: '5分', difficulty: 'medium' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 300 }, partnerMessage: '動いた分だけ脳が輝く！行ってこい！', isOffline: true },
      { title: 'シャドーボクシング', description: '立ち上がってシャドーボクシング1分間！全力でパンチを打て！フラストレーションを全部燃やし尽くせ！', duration: '1分', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 60 }, partnerMessage: '感情を全部エネルギーに変えろ！燃えてこい！', isOffline: true },
    ],
    en: [
      { title: '10 Burpees NOW', description: "10 burpees right now! Push-up → stand → jump. Spike your heart rate!", duration: '2 min', difficulty: 'medium' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: "Let's go! Burn together! You got this!", isOffline: true },
      { title: 'Get Outside', description: 'Put on your shoes and get outside for 5 minutes! Charge up your serotonin!', duration: '5 min', difficulty: 'medium' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 300 }, partnerMessage: 'Every step makes your brain shine! GO!', isOffline: true },
      { title: 'Shadow Boxing', description: 'Stand up and shadow box for 1 minute! Full power punches!', duration: '1 min', difficulty: 'easy' as ActionDifficulty, interactiveType: 'timer' as InteractiveType, timerConfig: { durationSeconds: 60 }, partnerMessage: 'Turn all that emotion into fuel! BURN!', isOffline: true },
    ],
    th: [
      { title: 'เบอร์พี 10 ครั้ง', description: 'เบอร์พี 10 ครั้งเดี๋ยวนี้!', duration: '2 นาที', difficulty: 'medium' as ActionDifficulty, interactiveType: 'none' as InteractiveType, partnerMessage: 'ไปเลย! เผาผลาญด้วยกัน! คุณทำได้!', isOffline: true },
    ],
  },
};

export function getRandomFallback(partner: PartnerType, language: Language): ActionSuggestion {
  const langActions = FALLBACK_ACTIONS[partner][language] ?? FALLBACK_ACTIONS[partner].ja;
  return langActions[Math.floor(Math.random() * langActions.length)];
}

// ─── OpenAI API呼び出し ────────────────────────────────────────────────
interface GenerateActionParams {
  partner: PartnerType;
  brainScore: number;
  language: Language;
}

export async function generateAction(params: GenerateActionParams): Promise<ActionSuggestion> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    // APIキー未設定の場合はフォールバックを返す
    return getRandomFallback(params.partner, params.language);
  }

  const systemPrompt = SYSTEM_PROMPTS[params.partner][params.language];

  const userMessage = buildUserMessage(params);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 350,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);

  const difficulty: ActionDifficulty =
    ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'medium';

  const interactiveType: InteractiveType =
    ['none', 'breathing', 'timer'].includes(parsed.interactiveType) ? parsed.interactiveType : 'none';

  return {
    title: parsed.title ?? '回復アクション',
    description: parsed.description ?? '',
    difficulty,
    interactiveType,
    breathingConfig: interactiveType === 'breathing' && parsed.breathingConfig
      ? {
          inhaleSeconds: parsed.breathingConfig.inhaleSeconds ?? 4,
          holdSeconds:   parsed.breathingConfig.holdSeconds   ?? 0,
          exhaleSeconds: parsed.breathingConfig.exhaleSeconds ?? 6,
          cycles:        parsed.breathingConfig.cycles        ?? 5,
        }
      : undefined,
    timerConfig: interactiveType === 'timer' && parsed.timerDurationSeconds
      ? { durationSeconds: parsed.timerDurationSeconds }
      : undefined,
    duration: parsed.duration ?? '5分',
    partnerMessage: parsed.partnerMessage ?? '',
    isOffline: false,
  };
}

function buildUserMessage({ brainScore, language }: GenerateActionParams): string {
  const langLabel: Record<Language, string> = {
    ja: '日本語',
    en: 'English',
    th: 'ภาษาไทย',
  };

  return `ユーザーの現在の状態:
- ブレインスコア: ${brainScore}/100 (${getScoreLabel(brainScore)})
- 回答言語: ${langLabel[language]}

上記の状態に基づき、今このユーザーに最適な回復アクションを1つ提案してください。
必ず${langLabel[language]}で回答し、以下のJSON形式で返してください:
{
  "title": "アクションのタイトル（15文字以内）",
  "description": "具体的な手順（60〜120文字）",
  "duration": "所要時間（例: 2分、5分、10分）",
  "difficulty": "easy または medium または hard",
  "partnerMessage": "パートナーらしい一言（20〜40文字）",
  "interactiveType": "none または breathing または timer",
  "breathingConfig": {
    "inhaleSeconds": 4,
    "holdSeconds": 0,
    "exhaleSeconds": 6,
    "cycles": 5
  },
  "timerDurationSeconds": 120
}
interactiveTypeの判断基準:
- breathing: 深呼吸・4-7-8呼吸・マインドフルネス呼吸など呼吸に集中するアクション
- timer: 冷水洗顔・読書・ウォーキング・瞑想など一定時間の作業
- none: 上記に当てはまらないもの
breathingConfigはinteractiveTypeがbreathingの時のみ含める
timerDurationSecondsはinteractiveTypeがtimerの時のみ含める（秒単位）`;
}

function getScoreLabel(score: number): string {
  if (score >= 91) return '非常に良好';
  if (score >= 71) return '良好';
  if (score >= 41) return '普通';
  if (score >= 21) return '注意';
  return '緊急';
}
