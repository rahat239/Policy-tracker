const PLAN_LIMITS = {
  free: {
    maxMonitors: 5,
    intervals: ['daily', 'weekly'],
    historyDays: 30,
    seats: 1,
  },
  pro: {
    maxMonitors: 50,
    intervals: ['hourly', 'daily', 'weekly'],
    historyDays: 9999,
    seats: 5,
  },
  enterprise: {
    maxMonitors: 9999,
    intervals: ['15min', 'hourly', 'daily', 'weekly'],
    historyDays: 9999,
    seats: 9999,
  },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

module.exports = { getPlanLimits, PLAN_LIMITS };
