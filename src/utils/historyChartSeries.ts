import type { ScoreEntry } from '../types';

export type HistoryChartPeriod = 'day' | 'week' | 'month' | 'all';

const DAY_MS = 86_400_000;

export function startOfWeekMondayMs(ts: number): number {
  const x = new Date(ts);
  if (Number.isNaN(x.getTime())) return ts;
  const y = x.getFullYear();
  const m = x.getMonth();
  const day = x.getDate();
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return new Date(y, m, day + diff).getTime();
}

export function startOfMonthMs(ts: number): number {
  const x = new Date(ts);
  if (Number.isNaN(x.getTime())) return ts;
  return new Date(x.getFullYear(), x.getMonth(), 1).getTime();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function latestPerBucket(
  entries: ScoreEntry[],
  keyFn: (e: ScoreEntry) => string,
): ScoreEntry[] {
  const map = new Map<string, ScoreEntry>();
  for (const e of entries) {
    const k = keyFn(e);
    const cur = map.get(k);
    if (!cur || e.timestamp >= cur.timestamp) map.set(k, e);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
}

function sampleEvenly(entries: ScoreEntry[], max: number): ScoreEntry[] {
  if (entries.length <= max) return entries;
  const out: ScoreEntry[] = [];
  const step = (entries.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    out.push(entries[Math.round(i * step)]);
  }
  return out;
}

/** 期間モードに応じて時系列を集計。2点未満なら null。 */
export function buildHistoryChartEntries(
  scoreHistory: ScoreEntry[],
  period: HistoryChartPeriod,
): ScoreEntry[] | null {
  const sorted = [...scoreHistory].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 2) return null;

  const now = Date.now();

  const ensureTwo = (series: ScoreEntry[]): ScoreEntry[] | null => {
    if (series.length >= 2) return series;
    const fallback = sorted.slice(-Math.min(14, sorted.length));
    return fallback.length >= 2 ? fallback : null;
  };

  switch (period) {
    case 'day': {
      const cutoff = now - 30 * DAY_MS;
      let win = sorted.filter((e) => e.timestamp >= cutoff);
      if (win.length < 2) win = sorted.slice(-Math.min(30, sorted.length));
      const byDay = latestPerBucket(win, (e) => dayKey(e.timestamp));
      return ensureTwo(byDay);
    }
    case 'week': {
      const cutoff = now - 12 * 7 * DAY_MS;
      let win = sorted.filter((e) => e.timestamp >= cutoff);
      if (win.length < 2) win = sorted;
      const byWeek = latestPerBucket(win, (e) => String(startOfWeekMondayMs(e.timestamp)));
      return ensureTwo(byWeek);
    }
    case 'month': {
      const cut = new Date();
      cut.setMonth(cut.getMonth() - 12);
      const cutoff = cut.getTime();
      let win = sorted.filter((e) => e.timestamp >= cutoff);
      if (win.length < 2) win = sorted;
      const byMonth = latestPerBucket(win, (e) => String(startOfMonthMs(e.timestamp)));
      return ensureTwo(byMonth);
    }
    case 'all': {
      return sampleEvenly(sorted, 48);
    }
    default:
      return sorted;
  }
}

/**
 * 横軸ラベルが密なとき間引く。
 * 右端で隣接ポイントのラベルが重なりやすいため、表示インデックス間に最低間隔を設ける。
 */
export function thinChartLabels(labels: string[]): string[] {
  const n = labels.length;
  if (n <= 6) return [...labels];

  const maxSlots = 7;
  const step = Math.max(1, Math.ceil((n - 1) / (maxSlots - 1)));
  const out = labels.map((label, i) => {
    if (i === 0 || i === n - 1) return label;
    return i % step === 0 ? label : '';
  });

  const minIndexDist = 2;
  while (true) {
    const vis = out.reduce<number[]>((acc, s, i) => (s !== '' ? [...acc, i] : acc), []);
    let removed = false;
    for (let k = vis.length - 1; k >= 1; k--) {
      const iR = vis[k];
      const iL = vis[k - 1];
        if (iR - iL < minIndexDist) {
          if (iL === 0) out[iR] = '';
          else out[iL] = '';
          removed = true;
          break;
        }
    }
    if (!removed) break;
  }

  return out;
}
