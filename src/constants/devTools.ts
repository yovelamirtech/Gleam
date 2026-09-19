/**
 * One clear flag every dev-only affordance is gated behind (BUILD_PLAN.md's
 * "מסומנים בבירור ככלי פיתוח"), so none of it needs stripping by hand before
 * release: `__DEV__` (React Native's own global) is false in any release
 * build, dev tools and all.
 */
export const DEV_TOOLS_ENABLED = __DEV__;
