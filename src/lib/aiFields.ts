/** Labels for known AI-related API fields (Swagger + live responses). */
const AI_FIELD_LABELS: Record<string, string> = {
  ai_evaluation: 'Kết quả đánh giá AI',
  aievaluation: 'Kết quả đánh giá AI',
  ai_reason: 'Giải thích AI',
  ai_reasoning: 'Giải thích AI',
};

export type AiFieldEntry = {
  key: string;
  label: string;
  value: string;
};

function normalizeAiKey(key: string) {
  return key.toLowerCase().replace(/-/g, '_');
}

function isAiFieldKey(key: string) {
  const n = normalizeAiKey(key);
  return n.startsWith('ai_') || n === 'aievaluation';
}

/** Collect non-empty AI fields from any API entity (supports snake_case and camelCase). */
export function collectAiFields(record: object | null | undefined): AiFieldEntry[] {
  if (!record || typeof record !== 'object') return [];

  const out: AiFieldEntry[] = [];
  const seen = new Set<string>();

  for (const [key, raw] of Object.entries(record as Record<string, unknown>)) {
    if (!isAiFieldKey(key)) continue;
    const value =
      typeof raw === 'string' ? raw.trim() : raw != null && raw !== '' ? String(raw).trim() : '';
    if (!value) continue;

    const norm = normalizeAiKey(key);
    if (seen.has(norm)) continue;
    seen.add(norm);

    out.push({
      key,
      label: AI_FIELD_LABELS[norm] ?? key.replace(/_/g, ' '),
      value,
    });
  }

  return out.sort((a, b) => {
    const rank = (k: string) => (normalizeAiKey(k).includes('reason') ? 1 : 0);
    return rank(a.key) - rank(b.key);
  });
}

export function hasAiFields(record: object | null | undefined): boolean {
  return collectAiFields(record).length > 0;
}

/** Short label for tables (evaluation / verdict first). */
export function getPrimaryAiEvaluation(record: object | null | undefined): string | undefined {
  const fields = collectAiFields(record);
  const verdict = fields.find((f) => {
    const n = normalizeAiKey(f.key);
    return n === 'ai_evaluation' || n === 'aievaluation';
  });
  return verdict?.value ?? fields[0]?.value;
}

export function isAiVerdictNegative(value?: string): boolean {
  if (!value) return false;
  const s = value.toLowerCase();
  return s.includes('invalid') || s.includes('reject') || s.includes('fail') || s === 'no';
}
