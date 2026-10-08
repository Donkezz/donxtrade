/**
 * The coin economy in one place.
 *
 * These numbers are also written into the translations (`gamification.*`,
 * `profile.boost*`, `create.successRewarded`) as literals, because each language
 * has to phrase them its own way. Change a value here and update those strings
 * in all six locale files together, or the intro screen will promise one thing
 * and the app will do another.
 */
export const ECONOMY = {
  /** What a fresh install starts with. */
  startingCoins: 50,
  /** Price of unlocking one contact. */
  unlockCost: 1,

  /** Earned for publishing a listing, up to `publishRewardsPerDay` times a day. */
  publishReward: 1,
  publishRewardsPerDay: 3,

  /** Earned once per listing when it is marked as handled, up to `resolveRewardsPerDay` a day. */
  resolveReward: 5,
  resolveRewardsPerDay: 2,

  /** Pushes one of your own listings to the top of the board. */
  boostCost: 5,
  boostHours: 24,
} as const;
