import { describe, expect, it } from "vitest";
import { GUEST_SEATS, canEditRoom, canManageRoom } from "@/lib/room-access";

describe("room access", () => {
  it("offers exactly one interviewee seat", () => { expect(GUEST_SEATS.interviewee).toBe(1); });
  it("offers exactly five spectator seats", () => { expect(GUEST_SEATS.spectator).toBe(5); });
  it("allows interviewees but not spectators to edit", () => {
    expect(canEditRoom("interviewee")).toBe(true);
    expect(canEditRoom("spectator")).toBe(false);
  });
  it("allows only hosts to manage sessions", () => {
    expect(canManageRoom(true)).toBe(true);
    expect(canManageRoom(false)).toBe(false);
  });
});