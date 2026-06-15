/**
 * Child-specific overrides. Anything exported here is merged on top of the
 * managed CMS surface. Keep this file small — the managed package owns the
 * bulk of the admin experience.
 */
export const overrides = {
  // dashboardWidgets: [],
  // adminRoutes: [],
  // theme: {},
};

export type ChildOverrides = typeof overrides;
