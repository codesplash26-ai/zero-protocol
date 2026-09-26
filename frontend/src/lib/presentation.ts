/** Presentation mode: larger type and no technical details, for demos on a projector. */
const KEY = 'eg-presentation-mode';
export const PRESENT_CLASS = 'eg-present';

export function isPresentationStored(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function storePresentation(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this page view.
  }
}
