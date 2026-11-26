/**
 * When the stars start to move.
 *
 * The graphics card is only given setup work while the picture on screen is still (schedule.ts), and the one
 * moment that is still without anyone noticing is before the stars have started. So they wait for the setup that
 * is at hand: with the files already on the device (any visit after the first) the scenes are finished before
 * the galaxy forms, and it runs straight on into the page. Stopping the formed galaxy for that work instead
 * read as the page freezing just before it opened.
 *
 * The stars never wait for a download (how long that takes is anyone's guess), and never for longer than
 * START_WAIT. Whatever is not done by then is done once the galaxy has formed, holding still.
 */

/** the stars start this long after the page, at the earliest: the loader is on screen first */
export const PREROLL = 350;
/** how long the galaxy takes to form */
export const FORM_MS = 2300;
/** the longest the stars are held back for setup, counted from when they could first have started */
export const START_WAIT = 2500;

/** one frame at 60 a second, in ms */
const FRAME = 1000 / 60;

/**
 * The intro's clock for this frame: ms since the stars started to move, negative before.
 *
 * `prev` is its value in the last frame (NaN before the first), `late` how long ago the stars could first have
 * started (negative until then), `gap` the time since the last frame, `atHand` whether there is setup that
 * could be getting on with something.
 */
export function introClock(prev: number, late: number, gap: number, atHand: boolean): number {
  // Moving: with the frames. When one runs long the galaxy holds for a moment instead of skipping ahead, which
  // read as a glitch. (A gap of over a second is the tab coming back from the background: catch up in one go)
  if (prev > 0) return prev + (gap > 1000 ? gap : Math.min(gap, 250));
  // the pre-roll, by the clock
  if (late <= 0) return late;
  // a page first shown long after it started (it loaded in a background tab): the intro is where it would be by now
  if (Number.isNaN(prev) && late >= START_WAIT) return late;
  // held on the starting line. Only there: once the stars have moved, nothing stops them
  if (atHand && late < START_WAIT) return 0;
  // They start with this frame, and from the beginning: the frame before it may have been a long one (the last
  // piece of setup), and that time is not the galaxy's
  return Math.min(late, FRAME);
}
