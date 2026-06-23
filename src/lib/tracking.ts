// Visitor/chat tracking disabled in the unified portal build (no separate marketing backend).
export function getSessionId(): string { return "local"; }
export function getConversationId(): string { return "local"; }
export function trackVisit(_path?: string): void {}
export function trackChatMessage(_role?: string, _text?: string): void {}
export default { getSessionId, getConversationId, trackVisit, trackChatMessage };
