export type NapSnapshot = {
  source: string;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
};

export type AuthoritySignals = {
  backlinks?: number;
  brandMentions?: number;
  reviews?: number;
  averageRating?: number;
  socialActivity?: number;
  citations?: number;
  knowledgeSources?: Partial<Record<"wikipedia" | "wikidata" | "crunchbase" | "bing_places", boolean>>;
};

export type AuthorityReport = {
  score: number;
  napConsistent: boolean;
  napConflicts: string[];
  missingKnowledgeSources: string[];
  notes: string[];
};

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function detectNapDrift(snapshots: NapSnapshot[]): string[] {
  if (snapshots.length < 2) return [];
  const conflicts: string[] = [];
  const base = snapshots[0];
  for (const snap of snapshots.slice(1)) {
    if (normalize(base.name) && normalize(snap.name) && normalize(base.name) !== normalize(snap.name)) {
      conflicts.push(`Name mismatch: ${base.source} vs ${snap.source}`);
    }
    if (normalize(base.address) && normalize(snap.address) && normalize(base.address) !== normalize(snap.address)) {
      conflicts.push(`Address mismatch: ${base.source} vs ${snap.source}`);
    }
    if (normalize(base.phone) && normalize(snap.phone) && normalize(base.phone) !== normalize(snap.phone)) {
      conflicts.push(`Phone mismatch: ${base.source} vs ${snap.source}`);
    }
  }
  return conflicts;
}

export function scoreAuthority(signals: AuthoritySignals, napSnapshots: NapSnapshot[] = []): AuthorityReport {
  const napConflicts = detectNapDrift(napSnapshots);
  let score = 40;
  score += Math.min(20, (signals.backlinks ?? 0) / 10);
  score += Math.min(10, (signals.brandMentions ?? 0) / 5);
  score += Math.min(10, (signals.reviews ?? 0) / 2);
  score += Math.min(5, ((signals.averageRating ?? 0) / 5) * 5);
  score += Math.min(5, (signals.socialActivity ?? 0) / 20);
  score += Math.min(5, (signals.citations ?? 0) / 5);

  const knowledge = signals.knowledgeSources ?? {};
  const required = ["wikipedia", "wikidata", "crunchbase", "bing_places"] as const;
  const missingKnowledgeSources = required.filter((k) => !knowledge[k]);
  score += (required.length - missingKnowledgeSources.length) * 2.5;
  if (napConflicts.length) score -= Math.min(20, napConflicts.length * 5);

  const notes: string[] = [];
  if (napConflicts.length) notes.push("NAP inconsistency detected across profiles.");
  if (missingKnowledgeSources.length) {
    notes.push(`Missing knowledge sources: ${missingKnowledgeSources.join(", ")}`);
  }
  if ((signals.reviews ?? 0) < 5) notes.push("Low review volume may limit local/entity confidence.");

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    napConsistent: napConflicts.length === 0,
    napConflicts,
    missingKnowledgeSources,
    notes,
  };
}
