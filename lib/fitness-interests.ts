export const MAX_FITNESS_INTERESTS = 3;

export const FITNESS_INTERESTS = [
  "Weight Training",
  "Football",
  "Yoga",
  "Running",
  "Hyrox",
  "Crossfit",
  "Basketball",
  "Badminton",
  "Swimming",
  "Cycling",
  "Pilates",
  "Calisthenics",
  "HIIT (High-Intensity Interval Training)",
  "Boxing / Muay Thai",
  "Tennis",
  "Hiking / Trail Running",
  "Powerlifting",
  "Bodybuilding",
  "Zumba / Dance Fitness",
  "Spinning / Indoor Cycling",
  "Rock Climbing",
  "Rowing",
  "Martial Arts",
  "Golf",
  "Stretching & Mobility",
] as const;

export type FitnessInterest = (typeof FITNESS_INTERESTS)[number];

const interestSet = new Set<string>(FITNESS_INTERESTS);

export function isValidFitnessInterest(value: string): value is FitnessInterest {
  return interestSet.has(value);
}

export function normalizeFitnessInterests(values: unknown): FitnessInterest[] {
  if (!Array.isArray(values)) return [];
  const picked: FitnessInterest[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !isValidFitnessInterest(value)) continue;
    if (picked.includes(value)) continue;
    picked.push(value);
    if (picked.length >= MAX_FITNESS_INTERESTS) break;
  }
  return picked;
}

export function sharedFitnessInterests(
  left: string[] | undefined,
  right: string[] | undefined
): FitnessInterest[] {
  const a = normalizeFitnessInterests(left);
  const b = new Set(normalizeFitnessInterests(right));
  return a.filter((interest) => b.has(interest));
}

export function canUnlockFriendChat(
  isFriend: boolean,
  left: string[] | undefined,
  right: string[] | undefined
): boolean {
  return isFriend && sharedFitnessInterests(left, right).length > 0;
}
