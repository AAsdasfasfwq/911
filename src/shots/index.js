// Shot list: every chapter registers its shots, anchored to the narration words.
import { makeDSL } from './dsl.js';
import intro from './ch00_intro.js';
import tenYears from './ch01_10years.js';
import oneYear from './ch02_1year.js';
import oneMonth from './ch03_1month.js';
import day from './ch04_24hours.js';
import hour from './ch05_1hour.js';
import attacks from './ch06_attacks.js';
import hourAfter from './ch07_1hour_after.js';
import dayAfter from './ch08_24hours_after.js';
import monthAfter from './ch09_1month_after.js';
import yearAfter from './ch10_1year_after.js';
import quarterCentury from './ch11_25years.js';

export const TOTAL = 1063.0;

export function buildShots(film, S) {
  const D = makeDSL(film, S);
  film.story = {};
  const chapters = [intro, tenYears, oneYear, oneMonth, day, hour, attacks, hourAfter, dayAfter, monthAfter, yearAfter, quarterCentury];
  for (const ch of chapters) ch(D, film);
  return Math.max(TOTAL, S.duration + 3);
}
