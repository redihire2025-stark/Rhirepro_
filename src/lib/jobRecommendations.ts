type RecommendationJob = {
  id: string;
  title: string;
  company_name?: string | null;
  location?: string | null;
  work_mode?: string | null;
  employment_type?: string | null;
  industry?: string | null;
  department?: string | null;
  skills?: string[] | null;
  description?: string | null;
};

type RecommendationProfile = {
  id?: string;
  location?: string | null;
  skills?: string[] | null;
  headline?: string | null;
  current_title?: string | null;
};

type RecommendationOptions = {
  userId?: string | null;
  profile?: RecommendationProfile | null;
  appliedJobIds?: string[];
  savedJobIds?: string[];
};

type StoredPreferenceSignal = {
  searches: string[];
  interactedJobs: RecommendationJob[];
};

const GUEST_SEARCH_KEY = "rhirepro_guest_searches";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function tokenize(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function uniqueTokens(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.flatMap((value) => tokenize(value)))];
}

function buildJobTokens(job: RecommendationJob): string[] {
  return uniqueTokens([
    job.title,
    job.company_name,
    job.location,
    job.work_mode,
    job.employment_type,
    job.industry,
    job.department,
    job.description,
    ...(job.skills || []),
  ]);
}

function getGuestSeed(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPreferenceKey(userId?: string | null): string {
  return userId ? `rhirepro_prefs_${userId}` : GUEST_SEARCH_KEY;
}

function readStoredSignals(userId?: string | null): StoredPreferenceSignal {
  const storage = getStorage();
  if (!storage) return { searches: [], interactedJobs: [] };

  try {
    const raw = storage.getItem(getPreferenceKey(userId));
    if (!raw) return { searches: [], interactedJobs: [] };
    const parsed = JSON.parse(raw) as Partial<StoredPreferenceSignal>;
    return {
      searches: Array.isArray(parsed.searches) ? parsed.searches.slice(0, 30) : [],
      interactedJobs: Array.isArray(parsed.interactedJobs) ? parsed.interactedJobs.slice(0, 30) : [],
    };
  } catch {
    return { searches: [], interactedJobs: [] };
  }
}

function writeStoredSignals(userId: string | null | undefined, data: StoredPreferenceSignal) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(
    getPreferenceKey(userId),
    JSON.stringify({
      searches: data.searches.slice(0, 30),
      interactedJobs: data.interactedJobs.slice(0, 30),
    })
  );
}

export function recordJobSearch(query: string, userId?: string | null) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return;

  const current = readStoredSignals(userId);
  writeStoredSignals(userId, {
    ...current,
    searches: [normalized, ...current.searches.filter((item) => item !== normalized)].slice(0, 20),
  });
}

export function recordJobInteraction(job: RecommendationJob, userId?: string | null) {
  const current = readStoredSignals(userId);
  writeStoredSignals(userId, {
    ...current,
    interactedJobs: [job, ...current.interactedJobs.filter((item) => item.id !== job.id)].slice(0, 20),
  });
}

function buildPreferenceWeights(
  jobs: RecommendationJob[],
  options: RecommendationOptions
): Map<string, number> {
  const weights = new Map<string, number>();
  const stored = readStoredSignals(options.userId);
  const appliedSet = new Set(options.appliedJobIds || []);
  const savedSet = new Set(options.savedJobIds || []);

  const boostTokens = (tokens: string[], amount: number) => {
    tokens.forEach((token) => {
      weights.set(token, (weights.get(token) || 0) + amount);
    });
  };

  stored.searches.forEach((search, index) => {
    boostTokens(tokenize(search), Math.max(6 - index * 0.2, 2));
  });

  stored.interactedJobs.forEach((job, index) => {
    boostTokens(buildJobTokens(job), Math.max(5 - index * 0.2, 2));
  });

  jobs.forEach((job) => {
    if (appliedSet.has(job.id)) boostTokens(buildJobTokens(job), 7);
    if (savedSet.has(job.id)) boostTokens(buildJobTokens(job), 5);
  });

  if (options.profile) {
    boostTokens(
      uniqueTokens([
        options.profile.location,
        options.profile.headline,
        options.profile.current_title,
        ...(options.profile.skills || []),
      ]),
      4
    );
  }

  return weights;
}

function scoreJob(
  job: RecommendationJob,
  weights: Map<string, number>,
  options: RecommendationOptions
): number {
  const jobTokens = buildJobTokens(job);
  const appliedSet = new Set(options.appliedJobIds || []);
  const savedSet = new Set(options.savedJobIds || []);

  let score = 0;
  jobTokens.forEach((token) => {
    score += weights.get(token) || 0;
  });

  if (savedSet.has(job.id)) score += 8;
  if (appliedSet.has(job.id)) score -= 12;

  if (options.profile?.location && job.location) {
    const userLocationTokens = tokenize(options.profile.location);
    const jobLocationTokens = tokenize(job.location);
    if (userLocationTokens.some((token) => jobLocationTokens.includes(token))) {
      score += 10;
    }
  }

  const deterministicNoise = (hashString(`${options.userId || "guest"}:${job.id}`) % 1000) / 100000;
  return score + deterministicNoise;
}

export function getRecommendedJobs<T extends RecommendationJob>(
  jobs: T[],
  options: RecommendationOptions = {}
): T[] {
  if (jobs.length <= 1) return jobs;

  if (!options.userId) {
    const guestSeed = getGuestSeed();
    return [...jobs].sort((a, b) => {
      const aHash = hashString(`${guestSeed}:${a.id}`);
      const bHash = hashString(`${guestSeed}:${b.id}`);
      return aHash - bHash;
    });
  }

  const weights = buildPreferenceWeights(jobs, options);
  return [...jobs].sort((a, b) => scoreJob(b, weights, options) - scoreJob(a, weights, options));
}
