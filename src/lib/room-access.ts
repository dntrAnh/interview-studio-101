export const GUEST_SEATS = { interviewee: 1, spectator: 5 } as const;
export function canEditRoom(role: string) {
  return role === "solo" || role === "interviewer" || role === "interviewee";
}
export function canManageRoom(isHost: boolean) { return isHost; }