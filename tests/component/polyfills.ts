// jsdom has no AnimationEvent. React checks for it when it loads and, without it, listens for the
// prefixed "webkitAnimationEnd" instead of "animationend", so onAnimationEnd never fires in a test.
// This file is imported first by setup.ts, before anything loads React.
if (!("AnimationEvent" in globalThis)) {
  class AnimationEvent extends Event {}
  Object.assign(globalThis, { AnimationEvent });
}
