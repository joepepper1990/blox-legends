// Misconceptions (plan §6.5): the wrong answers that come from a specific
// mistake. Generators tag those wrong options with a misconception id; when
// one is chosen, the game explains that exact mistake, asks a matched
// follow-up a few questions later and rechecks it the next day.
//
// Ids are stable (logged with each attempt). `explain(p)` gets the numbers of
// the question (`p`) and returns a short, friendly worked explanation.
import { registerIds } from './ids.js';

const M = (zone, name, explain) => ({ zone, name, explain });

export const MISCONCEPTIONS = {
  // ---- times tables ----
  'tab-next': M('number', 'One group too many', (p) => `That's one group too many. ${p.a} lots of ${p.t} is ${p.a * p.t}, not ${p.a + 1} lots.`),
  'tab-prev': M('number', 'One group too few', (p) => `That's one group short. ${p.a} lots of ${p.t} is ${p.a * p.t}.`),
  'tab-other': M('number', 'Used the wrong table', (p) => `That answer comes from a different table. Stick with the ${p.t}s: ${p.a} × ${p.t} = ${p.a * p.t}.`),
  'add-not-mul': M('number', 'Added instead of multiplying', (p) => `× means "lots of", not add. ${p.a} lots of ${p.t} is ${p.a * p.t}.`),
  'div-gave-divisor': M('number', 'Gave the number divided by', (p) => `${p.t} is the number we shared by. Ask: how many ${p.t}s make ${p.a * p.t}? It's ${p.a}.`),
  'div-subtracted': M('number', 'Took away instead of dividing', (p) => `÷ means sharing into groups, not taking away. ${p.a * p.t} ÷ ${p.t} = ${p.a} because ${p.a} × ${p.t} = ${p.a * p.t}.`),
  'missing-gave-product': M('number', 'Gave the total, not the missing number', (p) => `The total is already there. Count in ${p.t}s to ${p.a * p.t}: that takes ${p.a} jumps.`),
  // ---- adding and taking away ----
  'off-by-one': M('number', 'Counted one too far or not far enough', (p) => `So close! Count again carefully: the answer is ${p.answer}.`),
  'tens-slip': M('number', 'Ten out', (p) => `The ones are right but the tens slipped. The answer is ${p.answer}.`),
  'swap-digits': M('number', 'Swapped the digits', (p) => `The digits are the right ones but swapped round. It's ${p.answer}.`),
  'add-not-sub': M('number', 'Added instead of taking away', (p) => `− means take away. Count back to get ${p.answer}.`),
  'sub-not-add': M('number', 'Took away instead of adding', (p) => `+ means add on. Count on to get ${p.answer}.`),
  'mul-not-add': M('number', 'Multiplied instead of adding', (p) => `+ means add, not times. The answer is ${p.answer}.`),
  'sub-reverse-ones': M('number', 'Took the smaller ones digit from the bigger', (p) => `You can't take ${p.bo} from ${p.so}, so bridge through 10: ${p.s} − ${p.b} = ${p.answer}.`),
  'bond-gave-part': M('number', 'Gave the number already there', (p) => `${p.a} is the part we have. What do we add to make ${p.target}? It's ${p.answer}.`),
  'bond-to-ten': M('number', 'Made 10 instead of 20', (p) => `That makes 10, but we need ${p.target}. ${p.a} + ${p.answer} = ${p.target}.`),
  'bond100-both-ten': M('number', 'Made both the tens and the ones up to 10', (p) => `Careful with the tens: ${p.a} + ${p.answer} = 100. The ones make 10, so the tens only need to make 9 tens.`),
  'double-add-two': M('number', 'Added 2 instead of doubling', (p) => `Double means two lots of the same number: ${p.n} + ${p.n} = ${p.answer}.`),
  'half-sub-two': M('number', 'Took away 2 instead of halving', (p) => `Half means share into two equal parts: ${p.answer} + ${p.answer} = ${p.n}.`),
  'half-doubled': M('number', 'Doubled instead of halving', (p) => `Halving makes it smaller: half of ${p.n} is ${p.answer}.`),
  // ---- place value ----
  'pv-face': M('number', 'Gave the digit, not its value', (p) => `The digit is ${p.digit}, but it's in the ${p.place} place, so it's worth ${p.answer}.`),
  'pv-place': M('number', 'Mixed up the places', (p) => `Count the places from the right: ones, tens, hundreds. That ${p.digit} is worth ${p.answer}.`),
  'pv-concat': M('number', 'Wrote the parts side by side', (p) => `${p.parts} make ${p.answer}: hundreds, tens and ones each have one place.`),
  'pv-zero': M('number', 'Left out a zero place holder', (p) => `When there are no tens (or ones), a 0 holds the place: it's ${p.answer}.`),
  'pv-exchange': M('number', 'Forgot to exchange ten of a unit', (p) => `Ten ones make a ten (ten tens make a hundred). Exchange them: it's ${p.answer}.`),
  'cmp-ones-first': M('number', 'Compared the ones first', (p) => `Compare the hundreds first, then the tens, then the ones. ${p.answer} is the ${p.which}.`),
  'cmp-sign-flip': M('number', 'Pointed the sign the wrong way', () => `The open mouth of < or > always faces the bigger number.`),
  'more-wrong-place': M('number', 'Changed the wrong digit', (p) => `${p.step} ${p.dir} changes the ${p.place} digit: ${p.n} → ${p.answer}.`),
  'more-no-bridge': M('number', 'Didn’t cross into the next hundred (or ten)', (p) => `When the ${p.place} go past 9, the next place goes up (or down) by one: ${p.answer}.`),
  'more-direction': M('number', 'Went the wrong way', (p) => `${p.dir === 'more' ? 'More means bigger' : 'Less means smaller'}: the answer is ${p.answer}.`),
  'step-wrong-size': M('number', 'Used the wrong step size', (p) => `Find the step first: the numbers go up (or down) by ${p.step} each time, so it's ${p.answer}.`),
  'col-no-carry': M('number', 'Forgot to carry', (p) => `When a column adds up to 10 or more, carry the ten into the next column: ${p.answer}.`),
  'col-concat': M('number', 'Wrote a two-digit total in one column', (p) => `Only one digit fits in each column; carry the ten: ${p.answer}.`),
  'col-small-from-big': M('number', 'Took the smaller digit from the bigger one', (p) => `When the top digit is smaller, exchange a ten from the next column first: ${p.answer}.`),
  'col-no-decrement': M('number', 'Exchanged but didn’t take one off the next column', (p) => `After exchanging, the next column has one less: ${p.answer}.`),
  'inv-wrong-op': M('number', 'Used the same operation instead of the inverse', (p) => `Undo it with the opposite: ${p.inverse}. The missing number is ${p.answer}.`),
  'wp-wrong-op': M('number', 'Picked the wrong operation for the story', (p) => `Read the story again: ${p.why} So it's ${p.answer}.`),
  // ---- alphabet and codes ----
  'alpha-wrong-way': M('code', 'Moved the wrong way along the alphabet', (p) => `${p.dir === 'back' ? 'Before means go back' : 'After means go forward'} along the alphabet: ${p.answer}.`),
  'alpha-one-off': M('code', 'One letter out', (p) => `Use the alphabet strip and count the hops: it's ${p.answer}.`),
  'alpha-count-start': M('code', 'Counted the starting letter as a hop', (p) => `Don't count the letter you start on: hop ${p.n} times to reach ${p.answer}.`),
  'pos-anchor': M('code', 'Lost count from the anchor letters', (p) => `Use E5, J10, O15, T20, Y25: ${p.letter} is ${p.answer}.`),
  'code-wrong-way': M('code', 'Shifted the code the wrong way', (p) => `Check the direction in the example first: each letter moves ${p.how}. So it's ${p.answer}.`),
  'code-one-letter': M('code', 'Left a letter unchanged', (p) => `Every letter moves, not just some: ${p.answer}.`),
  'code-wrong-size': M('code', 'Moved by the wrong number of letters', (p) => `Count how far each letter moves in the example: ${p.how}. So it's ${p.answer}.`),
  'decode-not-reversed': M('code', 'Coded again instead of decoding', (p) => `To crack a code, go backwards: ${p.answer}.`),
  'series-wrong-step': M('code', 'Used the wrong step', (p) => `Look at the gaps between the letters: ${p.how}. Next is ${p.answer}.`),
  'series-one-off': M('code', 'One letter out', (p) => `Count the gap carefully with the strip: ${p.answer}.`),
  'mirror-shift': M('code', 'Shifted instead of mirroring', (p) => `Mirror code swaps A↔Z, B↔Y, C↔X… so it's ${p.answer}.`),
  // ---- cubes and shapes ----
  'cube-visible-only': M('shape', 'Counted only the blocks you can see', (p) => `Some blocks are hidden underneath, holding the top ones up. There are ${p.answer}.`),
  'cube-one-off': M('shape', 'Missed or double-counted a block', (p) => `Count layer by layer: ${p.layers}. That's ${p.answer}.`),
  'rot-mirror': M('shape', 'Picked the mirror image', () => `That one is a mirror image: you can't turn it to match, you'd have to flip it.`),
  'rot-moved': M('shape', 'Missed a block that moved', () => `Look for one block in a different place: that build isn't the same shape.`),
  'top-flipped': M('shape', 'View flipped or turned', () => `From right above, the front is at the bottom of the picture. Match each column carefully.`),
  'top-changed': M('shape', 'A square is added or missing', () => `Every column shows as one square from above, however tall it is.`),
  'nvr-one-rule': M('shape', 'Followed only one of the changes', (p) => `Two things change in this pattern: ${p.rules}. Check both.`),
  'nvr-wrong-step': M('shape', 'Changed by the wrong amount', (p) => `Check how much changes each time: ${p.rules}.`),
  'nvr-odd-other': M('shape', 'Spotted a difference that isn’t the rule', (p) => `Look for the one feature that all the others share: ${p.rule}.`),
};

registerIds('misconceptions', Object.keys(MISCONCEPTIONS));

export function explainFor(misId, params) {
  const m = MISCONCEPTIONS[misId];
  return m ? m.explain(params) : null;
}
