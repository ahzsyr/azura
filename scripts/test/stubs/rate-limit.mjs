// Rate limiting is a deployment concern; tests always get a free pass.
export const enforceRateLimit = async () => ({ allowed: true, remaining: 999 });

export const getRateLimitPort = () => ({
  incrementAndCheck: async () => ({ allowed: true, remaining: 999 }),
  reset: async () => undefined,
});

export const setRateLimitPort = () => undefined;
