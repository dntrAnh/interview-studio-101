export const GUEST_SEATS = { interviewee: 1, spectator: 5 } as const;
export function isPastGuestRoom(mode: string, status: string, isHost: boolean) {
  return mode === "mock" && status !== "active" && !isHost;
}
export function canEditRoom(role: string, pastRoom = false) {
  if (pastRoom) return false;
  return role === "solo" || role === "interviewer" || role === "interviewee";
}
export function canManageRoom(isHost: boolean) { return isHost; }
export function roomExecutionMode(mode: string) {
  return mode === "mock" ? "run-only" : "practice";
}