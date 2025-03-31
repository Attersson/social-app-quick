interface ActionRecord {
  timestamp: number;
  count: number;
}

interface SpamCheckResult {
  allowed: boolean;
  message?: string;
  nextAllowedTime?: Date;
}

const RATE_LIMITS = {
  POST: {
    cooldown: 60,    // 1 minute between posts
    maxPerHour: 10,
    maxPerDay: 50
  },
  COMMENT: {
    cooldown: 30,    // 30 seconds between comments
    maxPerHour: 20,
    maxPerDay: 100
  },
  LIKE: {
    cooldown: 5,     // 5 seconds between likes
    maxPerHour: 100,
    maxPerDay: 500
  },
  UNLIKE: {
    cooldown: 5,     // 5 seconds between unlikes
    maxPerHour: 100,
    maxPerDay: 500
  }
} as const;

const STORAGE_KEYS = {
  POST: 'spam_prevention_post',
  COMMENT: 'spam_prevention_comment',
  LIKE: 'spam_prevention_like',
  UNLIKE: 'spam_prevention_unlike'
} as const;

// Internal helper functions
const getActionRecords = (key: string): ActionRecord[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveActionRecords = (key: string, records: ActionRecord[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving action records:', error);
  }
};

const checkAction = (actionType: keyof typeof RATE_LIMITS): SpamCheckResult => {
  const now = Date.now();
  const limit = RATE_LIMITS[actionType];
  const storageKey = STORAGE_KEYS[actionType];
  
  // Get existing records
  const records = getActionRecords(storageKey);
  
  // Clean up old records
  const recentRecords = records.filter(record => {
    const age = now - record.timestamp;
    return age < 24 * 60 * 60 * 1000; // Keep last 24 hours
  });

  // Check cooldown
  const lastAction = recentRecords[recentRecords.length - 1];
  if (lastAction) {
    const timeSinceLastAction = (now - lastAction.timestamp) / 1000;
    if (timeSinceLastAction < limit.cooldown) {
      const nextAllowed = new Date(lastAction.timestamp + limit.cooldown * 1000);
      return {
        allowed: false,
        message: `Please wait ${Math.ceil(limit.cooldown - timeSinceLastAction)} seconds before ${actionType.toLowerCase()}ing again.`,
        nextAllowedTime: nextAllowed
      };
    }
  }

  // Check hourly limit
  const hourlyRecords = recentRecords.filter(record => {
    const age = now - record.timestamp;
    return age < 60 * 60 * 1000; // Last hour
  });
  if (hourlyRecords.length >= limit.maxPerHour) {
    const oldestHourlyRecord = hourlyRecords[0];
    const nextAllowed = new Date(oldestHourlyRecord.timestamp + 60 * 60 * 1000);
    return {
      allowed: false,
      message: `You've reached the hourly ${actionType.toLowerCase()} limit. Please try again later.`,
      nextAllowedTime: nextAllowed
    };
  }

  // Check daily limit
  if (recentRecords.length >= limit.maxPerDay) {
    const oldestRecord = recentRecords[0];
    const nextAllowed = new Date(oldestRecord.timestamp + 24 * 60 * 60 * 1000);
    return {
      allowed: false,
      message: `You've reached the daily ${actionType.toLowerCase()} limit. Please try again tomorrow.`,
      nextAllowedTime: nextAllowed
    };
  }

  // Record the action
  recentRecords.push({ timestamp: now, count: 1 });
  saveActionRecords(storageKey, recentRecords);

  return { allowed: true };
};

export const spamPreventionService = {
  async checkPostSpam(): Promise<SpamCheckResult> {
    return checkAction('POST');
  },

  async checkCommentSpam(): Promise<SpamCheckResult> {
    return checkAction('COMMENT');
  },

  async checkLikeSpam(): Promise<SpamCheckResult> {
    return checkAction('LIKE');
  },

  async checkUnlikeSpam(): Promise<SpamCheckResult> {
    return checkAction('UNLIKE');
  }
}; 