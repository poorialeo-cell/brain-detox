import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';

if (getApps().length === 0) {
  initializeApp();
}

// Firebase Secret Manager で管理する OpenAI API キー
// デプロイ前に: firebase functions:secrets:set OPENAI_API_KEY
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// ── 型定義 ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ProxyRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  /** true のとき response_format: { type: 'json_object' } を付与 */
  json_mode?: boolean;
}

// ── レート制限 ─────────────────────────────────────────────────────────
// 1ユーザーあたりの最大トークン数（サーバー側でも上限を設ける）
const MAX_TOKENS_LIMIT = 800;
const MIN_TEMPERATURE = 0.0;
const MAX_TEMPERATURE = 1.5;

// uid 単位のクォータ
const DAILY_LIMIT_PER_USER = 50;       // 1日あたりの呼び出し上限
const MINUTE_LIMIT_PER_USER = 10;       // バーストガード（1分あたり）

/**
 * Firestore トランザクションで uid のレート制限をチェック＆カウンタ更新する。
 * 失敗時は HttpsError('resource-exhausted') を throw。
 */
async function enforceRateLimit(uid: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('rateLimits').doc(uid);
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);      // YYYY-MM-DD (UTC)
  const minuteKey = Math.floor(now / 60_000);                    // 分単位の整数

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    const currentDay = data.dayKey === dayKey ? Number(data.dailyCount ?? 0) : 0;
    const currentMin = data.minuteKey === minuteKey ? Number(data.minuteCount ?? 0) : 0;

    if (currentDay >= DAILY_LIMIT_PER_USER) {
      throw new HttpsError(
        'resource-exhausted',
        `1日あたりのAI呼び出し上限 (${DAILY_LIMIT_PER_USER}回) に達しました。明日また試してください。`,
      );
    }
    if (currentMin >= MINUTE_LIMIT_PER_USER) {
      throw new HttpsError(
        'resource-exhausted',
        `短時間に多数のリクエストを検出しました。少し時間を空けてください。`,
      );
    }

    tx.set(
      ref,
      {
        dayKey,
        dailyCount: currentDay + 1,
        minuteKey,
        minuteCount: currentMin + 1,
        lastCallAt: Timestamp.fromMillis(now),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

// ── プロキシ関数 ───────────────────────────────────────────────────────

export const openaiProxy = onCall(
  {
    secrets: [openaiApiKey],
    // App Check を有効化したら true に変更（フェーズ2）
    enforceAppCheck: false,
    // Cloud Run IAM: 全ユーザーに invoker 権限を付与（callable 関数は Firebase SDK が Auth を検証する）
    invoker: 'public',
    // タイムアウト 30 秒
    timeoutSeconds: 30,
    // メモリ 256MB
    memory: '256MiB',
    // リージョン（日本に近い東京）
    region: 'asia-northeast1',
  },
  async (request) => {
    // ── 認証チェック（本番） ──────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'ログインが必要です');
    }

    const uid = request.auth.uid;

    const data = request.data as ProxyRequest;

    // ── 入力バリデーション ────────────────────────────────────────────
    if (!Array.isArray(data.messages) || data.messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages は1件以上必要です');
    }
    if (data.messages.length > 8) {
      throw new HttpsError('invalid-argument', 'messages は8件以内にしてください');
    }
    for (const msg of data.messages) {
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        throw new HttpsError('invalid-argument', `不正な role: ${msg.role}`);
      }
      if (typeof msg.content !== 'string' || msg.content.length > 4000) {
        throw new HttpsError('invalid-argument', 'content が不正または長すぎます');
      }
    }

    // ── レート制限チェック（OpenAI 呼び出し前に実行） ─────────────────
    await enforceRateLimit(uid);

    // ── パラメータのサニタイズ ────────────────────────────────────────
    const maxTokens = Math.min(
      MAX_TOKENS_LIMIT,
      Math.max(1, Math.round(data.max_tokens ?? 420)),
    );
    const temperature = Math.min(
      MAX_TEMPERATURE,
      Math.max(MIN_TEMPERATURE, data.temperature ?? 0.88),
    );

    // ── OpenAI 呼び出し ───────────────────────────────────────────────
    // Secret Manager に貼り付け時の改行/空白を除去（HTTP ヘッダー違反防止）
    const apiKey = openaiApiKey.value().trim();
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: data.messages,
      max_tokens: maxTokens,
      temperature,
      ...(data.json_mode ? { response_format: { type: 'json_object' } } : {}),
    });

    const content = completion.choices[0]?.message?.content ?? '';
    return { content };
  },
);
