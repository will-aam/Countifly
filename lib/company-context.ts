export const companyContextStorageKey = (userId: number) =>
  `countifly_selected_company_id:${userId}`;

export const getStoredCompanyContext = (userId: number) => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(companyContextStorageKey(userId));
};

export const setStoredCompanyContext = (
  userId: number,
  companyId: number | null,
) => {
  if (typeof window === "undefined") return;
  const key = companyContextStorageKey(userId);
  if (companyId == null) localStorage.removeItem(key);
  else localStorage.setItem(key, String(companyId));
};

export type CountMode = "audit" | "import";

const countContextLockKey = (userId: number, mode: CountMode) =>
  `countifly_active_count_context:${userId}:${mode}`;
export const teamSessionContextLockKey = (userId: number) =>
  `countifly_active_team_session:${userId}`;

export const getCountContextSnapshot = (userId: number, mode: CountMode) => {
  if (typeof window === "undefined") return undefined;
  const value = localStorage.getItem(countContextLockKey(userId, mode));
  if (value === null) return undefined;
  if (value === "none") return null;
  const companyId = Number(value);
  return Number.isInteger(companyId) && companyId > 0 ? companyId : null;
};

export const activateCountContextLock = (
  userId: number,
  mode: CountMode,
  companyId?: number | null,
) => {
  const previous = getCountContextSnapshot(userId, mode);
  const snapshot = previous !== undefined
    ? previous
    : companyId !== undefined
      ? companyId
      : (() => {
          const current = getStoredCompanyContext(userId);
          return current && Number.isInteger(Number(current)) ? Number(current) : null;
        })();
  localStorage.setItem(
    countContextLockKey(userId, mode),
    snapshot == null ? "none" : String(snapshot),
  );
  const selectedContext = getStoredCompanyContext(userId);
  const snapshotValue = snapshot == null ? null : String(snapshot);
  if (previous === undefined || selectedContext !== snapshotValue) {
    setStoredCompanyContext(userId, snapshot);
    dispatchCompanyContextLock(true, snapshot, `count-${mode}`);
  }
  return snapshot;
};

export const releaseCountContextLock = (userId: number, mode: CountMode) => {
  localStorage.removeItem(countContextLockKey(userId, mode));
  dispatchCompanyContextLock(false, null, `count-${mode}`);
};

export const dispatchCompanyContextLock = (
  locked: boolean,
  companyId: number | null = null,
  source = "team-session",
  userId?: number,
) => {
  if (typeof window === "undefined") return;
  if (source === "team-session" && userId != null) {
    const key = teamSessionContextLockKey(userId);
    if (locked) localStorage.setItem(key, companyId == null ? "none" : String(companyId));
    else localStorage.removeItem(key);
  }
  window.dispatchEvent(
    new CustomEvent("companyContextLockChanged", {
      detail: { locked, companyId, source },
    }),
  );
};
