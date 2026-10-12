// The adaptive brain. Tracks every skill, decides what to ask next, and keeps
// the success rate near the 80–85% sweet spot: hard enough to grow, easy
// enough to feel like winning.
//
// Per skill we keep:
//   n, c      attempts / first-try correct
//   ema       smoothed accuracy 0..1 (also used as the difficulty knob)
//   streak    current run of correct answers
//   box, due  spaced-repetition box (0..5) and when it's next due
//   ms        smoothed answer time in milliseconds

import { SKILLS, SKILL_BY_ID, skillsInArea } from './skills.js';
import { clamp } from './rng.js';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
export const INTERVALS = [0, 10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 21 * DAY];

export const MASTERED = 0.85;
const OPENS_NEXT = 0.75;

export function freshRecord() {
  return { n: 0, c: 0, ema: 0.5, streak: 0, box: 0, due: 0, last: 0, ms: 0 };
}

export class Mastery {
  constructor(state = {}, now = () => Date.now()) {
    this.state = state; // { skills: {id: record}, recent: {area: [0|1,...]} }
    this.state.skills ||= {};
    this.state.recent ||= {};
    this.now = now;
  }

  rec(id) {
    return (this.state.skills[id] ||= freshRecord());
  }

  isMastered(id) {
    const r = this.state.skills[id];
    return !!r && r.n >= 4 && r.ema >= MASTERED;
  }

  isUnlocked(id) {
    const skill = SKILL_BY_ID[id];
    return skill.pre.every((p) => {
      const r = this.state.skills[p];
      return r && r.n >= 4 && r.ema >= OPENS_NEXT;
    });
  }

  status(id) {
    if (!this.isUnlocked(id)) return 'locked';
    const r = this.state.skills[id];
    if (!r || r.n === 0) return 'new';
    if (this.isMastered(id)) return r.due <= this.now() ? 'review' : 'mastered';
    return 'learning';
  }

  record(id, correct, ms = 0) {
    const r = this.rec(id);
    const t = this.now();
    r.n += 1;
    if (correct) r.c += 1;
    r.ema = r.ema * 0.75 + (correct ? 1 : 0) * 0.25;
    r.streak = correct ? r.streak + 1 : 0;
    // Fast track: four straight right answers on a brand-new skill means he
    // already knows it — treat that as placement and move on.
    if (correct && r.n === 4 && r.c === 4) r.ema = Math.max(r.ema, 0.9);
    if (correct) {
      if (r.streak >= 2) r.box = Math.min(r.box + 1, INTERVALS.length - 1);
    } else {
      r.box = Math.max(0, r.box - 2);
    }
    r.due = t + INTERVALS[r.box];
    r.last = t;
    if (ms > 0 && ms < 120000) r.ms = r.ms ? r.ms * 0.7 + ms * 0.3 : ms;

    const area = SKILL_BY_ID[id].area;
    const recent = (this.state.recent[area] ||= []);
    recent.push(correct ? 1 : 0);
    if (recent.length > 20) recent.shift();
  }

  recentAccuracy(area) {
    const r = this.state.recent[area] || [];
    if (r.length < 5) return 0.85;
    return r.reduce((a, b) => a + b, 0) / r.length;
  }

  // Choose the next skill to practise in an area.
  pick(area, rng = Math.random) {
    const t = this.now();
    const open = skillsInArea(area).filter((s) => this.isUnlocked(s.id));
    const frontier = open.filter((s) => !this.isMastered(s.id));
    const due = open
      .filter((s) => this.isMastered(s.id) && this.rec(s.id).due <= t)
      .sort((a, b) => this.rec(a.id).due - this.rec(b.id).due);
    const mastered = open.filter((s) => this.isMastered(s.id));

    // Struggling → more familiar review; cruising → more new learning.
    const reviewP = clamp(0.25 + (0.85 - this.recentAccuracy(area)) * 1.5, 0.1, 0.6);

    if (due.length && (rng() < reviewP || !frontier.length)) return due[0].id;
    if (frontier.length) {
      // Mostly the earliest open skill, sometimes the next one (interleaving).
      if (frontier.length > 1 && rng() < 0.3) return frontier[1].id;
      return frontier[0].id;
    }
    if (mastered.length) return mastered[Math.floor(rng() * mastered.length)].id;
    return skillsInArea(area)[0].id;
  }

  level(id) {
    return this.state.skills[id]?.ema ?? 0.5;
  }

  areaProgress(area) {
    const list = skillsInArea(area);
    const mastered = list.filter((s) => this.isMastered(s.id)).length;
    // Partial credit for skills in progress so the bar moves every session.
    const partial = list.reduce((sum, s) => {
      const r = this.state.skills[s.id];
      if (!r || this.isMastered(s.id)) return sum;
      return sum + clamp((r.ema - 0.5) / (MASTERED - 0.5), 0, 0.9) * Math.min(1, r.n / 6);
    }, 0);
    return { mastered, total: list.length, pct: (mastered + partial) / list.length };
  }

  summary() {
    return SKILLS.map((s) => ({ ...s, status: this.status(s.id), rec: this.state.skills[s.id] || freshRecord() }));
  }
}
