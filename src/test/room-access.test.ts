import { describe, expect, it } from "vitest";
import { GUEST_SEATS, canEditRoom, canManageRoom, isPastGuestRoom, roomExecutionMode } from "@/lib/room-access";

describe("room access", () => {
  it("makes ended mock rooms read-only for interviewees", () => {
    expect(canEditRoom("interviewee", isPastGuestRoom("mock", "ended", false))).toBe(false);
  });
  it("makes archived mock rooms read-only for interviewees", () => {
    expect(canEditRoom("interviewee", isPastGuestRoom("mock", "archived", false))).toBe(false);
  });
  it("keeps past mock rooms read-only for spectators", () => {
    expect(canEditRoom("spectator", isPastGuestRoom("mock", "ended", false))).toBe(false);
  });
  it("retains active interviewee editing", () => {
    expect(canEditRoom("interviewee", isPastGuestRoom("mock", "active", false))).toBe(true);
  });
  it("does not restrict the host to guest history access", () => {
    expect(canEditRoom("interviewer", isPastGuestRoom("mock", "ended", true))).toBe(true);
  });
  it("uses run-only execution for mock whiteboards", () => expect(roomExecutionMode("mock")).toBe("run-only"));
  it("retains submissions and reviews for solo practice", () => expect(roomExecutionMode("solo")).toBe("practice"));
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