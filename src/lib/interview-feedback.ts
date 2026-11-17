export const MAX_FEEDBACK_LENGTH = 4000;

export function canPostFeedback(mode: string, isHost: boolean) {
  return mode === "mock" && isHost;
}

export function validFeedback(body: string) {
  const text = body.trim();
  return text.length > 0 && text.length <= MAX_FEEDBACK_LENGTH;
}