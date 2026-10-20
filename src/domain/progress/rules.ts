// Progress thresholds, kept in one place so they're easy to tune once they've been felt.

// A skill is solid once it has been answered correctly this many times…
export const SOLID_MIN_CORRECT = 3;
// …and the most recent attempts (this many) were all correct.
export const SOLID_RECENT_STREAK = 2;

// A checkpoint is this many mixed sentences from the whole level…
export const CHECKPOINT_SIZE = 15;
// …and passing it takes at least this fraction correct.
export const CHECKPOINT_PASS = 0.85;
