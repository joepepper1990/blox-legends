// The checker's own word knowledge, kept separate from the question banks:
// which words mean the same, which are opposites, which belong to a
// category, and which real compound words exist. Banks are checked against
// this, so an authoring slip (a "wrong" option that is actually right, or a
// distractor that secretly makes a real compound word) is caught.

// Words in a group mean (nearly) the same. A word may be in several groups.
const SYN_GROUPS = [
  ['big', 'large', 'huge', 'enormous', 'giant'],
  ['small', 'little', 'tiny', 'mini'],
  ['happy', 'glad', 'pleased', 'cheerful', 'joyful'],
  ['sad', 'unhappy', 'miserable', 'upset'],
  ['fast', 'quick', 'rapid', 'speedy', 'swift'],
  ['begin', 'start'],
  ['end', 'finish', 'stop'],
  ['shut', 'close'],
  ['shout', 'yell', 'scream'],
  ['jump', 'leap', 'hop'],
  ['angry', 'cross', 'mad', 'furious'],
  ['rich', 'wealthy'],
  ['scared', 'afraid', 'frightened'],
  ['quiet', 'silent', 'hushed'],
  ['easy', 'simple'],
  ['hard', 'difficult', 'tricky'],
  ['shiny', 'bright', 'gleaming'],
  ['wet', 'damp', 'soggy'],
  ['smart', 'clever'],
  ['silly', 'foolish', 'daft'],
  ['cold', 'chilly', 'freezing', 'icy', 'frozen'],
  ['hot', 'boiling', 'warm'],
  ['look', 'see', 'watch'],
  ['talk', 'speak', 'chat'],
  ['walk', 'stroll'],
  ['near', 'close'],
  ['friend', 'pal', 'mate'],
  ['gift', 'present'],
  ['mend', 'fix', 'repair'],
  ['build', 'make'],
  ['brave', 'bold'],
  ['kind', 'nice', 'gentle'],
  ['mean', 'unkind', 'cruel'],
  ['noisy', 'loud'],
  ['dirty', 'filthy'],
  ['tired', 'sleepy', 'drowsy'],
  ['hungry', 'starving'],
  ['laugh', 'giggle'],
  ['cry', 'weep'],
  ['throw', 'toss'],
  ['grab', 'snatch'],
  ['pull', 'tug'],
  ['fall', 'tumble'],
  ['hurry', 'rush'],
  ['enjoy', 'like'],
  ['choose', 'pick'],
  ['under', 'below', 'beneath'],
  ['above', 'over'],
  ['whole', 'complete'],
  ['correct', 'right', 'true'],
  ['wrong', 'incorrect', 'false'],
  ['terrible', 'awful'],
  ['wonderful', 'amazing'],
  ['strange', 'odd'],
  ['shy', 'timid'],
  ['neat', 'tidy'],
  ['sick', 'ill', 'unwell'],
  ['sound', 'noise'],
  ['middle', 'centre'],
  ['sea', 'ocean'],
  ['woods', 'forest'],
  ['shop', 'store'],
  ['job', 'work'],
  ['smile', 'grin'],
  ['sum', 'total'],
  ['stone', 'rock'],
  ['sleep', 'doze', 'nap'],
  ['push', 'shove'],
  ['full', 'packed'],
  ['win', 'beat'],
  ['remember', 'recall'],
  ['arrive', 'come', 'reach'],
  ['true', 'real', 'right'],
  ['rough', 'bumpy'],
  ['float', 'drift'],
  ['send', 'post'],
  ['inside', 'within', 'indoors'],
  ['whisper', 'murmur'],
  ['sharp', 'pointed'],
  ['tight', 'firm'],
  ['wide', 'broad'],
  ['ancient', 'old'],
  ['strong', 'tough'],
  ['tall', 'high'],
  ['always', 'forever'],
  ['add', 'plus'],
  ['give', 'offer'],
  ['question', 'query'],
  ['before', 'earlier'],
  ['heavy', 'weighty'],
  ['same', 'alike', 'equal'],
  ['love', 'adore'],
  ['top', 'peak'],
  ['stand', 'rise'],
  ['awake', 'alert'],
  ['wild', 'fierce'],
  ['calm', 'peaceful'],
  ['lost', 'missing'],
];

// Opposites (both ways round).
const ANT_PAIRS = `
  big small|large small|huge tiny|little large|little big|happy sad|glad sorry|fast slow|quick slow|rapid slow
  begin finish|start finish|end start|shut open|shout whisper|angry calm|cross calm|rich poor|scared brave
  quiet loud|quiet noisy|easy hard|shiny dull|wet dry|damp dry|smart silly|silly sensible|cold hot|hot freezing
  near far|friend enemy|mend break|build break|fix break|kind mean|kind cruel|noisy silent|dirty clean
  hungry full|laugh cry|throw catch|grab drop|pull push|fall rise|hurry wait|enjoy hate|love hate|under above
  above below|whole half|correct wrong|wrong right|true false|sleepy awake|asleep awake|terrible wonderful
  strange normal|shy bold|neat messy|sick well|sound silence|smile frown|sleep wake|ill healthy|up down
  open shut|day night|full empty|dark light|early late|win lose|young old|loud quiet|first last|soft hard
  thick thin|remember forget|arrive leave|buy sell|rough smooth|float sink|send receive|inside outside
  whisper shout|sharp blunt|tight loose|wide narrow|ancient modern|strong weak|cheap expensive|tall short
  always never|add subtract|give take|give receive|borrow lend|question answer|north south|before after
  heavy light|same different|top bottom|front back|come go|stand sit|polite rude|lost found|enter exit
  cheerful miserable|happy miserable|wild tame
`
  .trim()
  .split(/\|\s*|\n\s*/)
  .map((p) => p.trim().split(' '));

const syn = new Map();
for (const g of SYN_GROUPS) for (const w of g) for (const v of g) if (v !== w) (syn.get(w) || syn.set(w, new Set()).get(w)).add(v);
const ant = new Map();
for (const [a, b] of ANT_PAIRS) {
  (ant.get(a) || ant.set(a, new Set()).get(a)).add(b);
  (ant.get(b) || ant.set(b, new Set()).get(b)).add(a);
}
export const isSynonym = (a, b) => !!syn.get(a.toLowerCase())?.has(b.toLowerCase());
export const isAntonym = (a, b) => !!ant.get(a.toLowerCase())?.has(b.toLowerCase());
export const knowsWord = (w) => syn.has(w.toLowerCase()) || ant.has(w.toLowerCase());

// Categories, for odd-one-out: a question is ambiguous if another category
// singles out a different word.
export const CATEGORIES = {
  fruit: 'apple pear plum grape banana orange cherry peach lemon mango',
  vegetable: 'carrot pea onion cabbage potato leek bean sprout lettuce',
  colour: 'red blue green yellow purple orange pink black white brown',
  'farm animal': 'cow pig sheep goat hen horse duck',
  'wild animal': 'lion tiger zebra giraffe elephant monkey',
  animal:
    'cow pig sheep goat lion tiger zebra giraffe hen robin owl eagle sparrow bat ant bee beetle wasp spider puppy kitten foal calf horse cat dog rabbit hamster shark snake lizard crocodile tortoise frog crab octopus jellyfish starfish squirrel duck elephant monkey whale',
  bird: 'robin owl eagle sparrow hen duck',
  flies: 'robin owl eagle sparrow bat bee wasp duck',
  'body part': 'arm leg hand foot head nose eye',
  clothes: 'shirt sock coat scarf hat shoe glove',
  furniture: 'chair table bed sofa desk',
  weather: 'rain snow wind fog sun storm hail',
  number: 'one two three ten four five',
  'flat shape': 'circle square triangle oval rectangle',
  'solid shape': 'cube sphere cone cylinder pyramid',
  instrument: 'drum flute piano violin guitar',
  insect: 'ant bee beetle wasp fly butterfly',
  vehicle: 'car bus van lorry train bike',
  tool: 'hammer saw drill spade',
  metal: 'iron gold silver copper',
  job: 'doctor teacher farmer baker nurse',
  feeling: 'happy sad angry scared',
  tree: 'oak ash pine elm beech',
  flower: 'rose daisy tulip lily',
  drink: 'milk juice water tea',
  building: 'house castle school church',
  season: 'spring summer autumn winter',
  sport: 'football tennis cricket rugby',
  'eat with': 'spoon fork knife chopsticks',
  'write with': 'pen pencil crayon chalk',
  water: 'river lake sea pond stream puddle wave rain',
  'high land': 'hill mountain cliff peak',
  moving: 'run jump hop skip walk',
  speaking: 'say shout whisper mutter',
  'big word': 'big huge giant large',
  'small word': 'tiny little small mini',
  'cold word': 'cold icy frozen chilly',
  'baby animal': 'puppy kitten foal calf',
  pet: 'cat dog rabbit hamster',
  meal: 'breakfast lunch dinner supper',
  'gives light': 'lamp torch candle lantern',
  reptile: 'snake lizard crocodile tortoise',
  planet: 'mars venus earth jupiter',
  'sea creature': 'crab octopus jellyfish starfish shark whale',
  room: 'kitchen bedroom bathroom hall',
  toy: 'kite doll yoyo puzzle',
  'wet thing': 'rain puddle river wave sea lake pond',
};
const CAT = Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, new Set(v.split(' '))]));
// Real words that belong to none of the categories above (used to make sure
// every option is a word the checker knows, never for grouping).
const OTHER_WORDS = new Set(
  'round sand tent corner radio road glass hospital bread holiday picnic plate sleep write warm blanket moon garden pillow dust'.split(' '),
);
export const inSomeCategory = (w) => OTHER_WORDS.has(w.toLowerCase()) || Object.values(CAT).some((set) => set.has(w.toLowerCase()));
export function oddOneOut(words) {
  // every category in which all but one word belong: which word is left out?
  const lw = words.map((w) => w.toLowerCase());
  const outs = new Set();
  let groups = 0;
  for (const [, set] of Object.entries(CAT)) {
    const outside = lw.filter((w) => !set.has(w));
    if (outside.length === 1) {
      outs.add(outside[0]);
      groups++;
    }
  }
  return { outs: [...outs], groups };
}

// Real compound words, by their first part.
const COMPOUND_LIST = `
  sun: flower light shine set rise burn day hat glasses beam bed dial spot block cream roof
  rain: bow coat drop fall forest water storm
  foot: ball path print step wear note
  butter: fly cup scotch milk nut
  snow: man ball flake fall drop storm board
  tooth: brush paste pick ache
  book: case mark shop shelf worm
  bed: room time side spread bug
  cup: board cake
  pan: cake
  star: fish light
  door: bell knob step way mat
  hand: bag shake stand writing ball rail made
  pop: corn
  lady: bird
  jelly: fish bean
  super: market man star hero
  water: fall melon proof colour slide
  play: ground time room park house mate
  sand: castle pit paper box stone
  sea: side shell weed horse gull food shore
  earth: quake worm
  home: work sick town school made
  birth: day place
  some: thing one where times body day how
  every: one thing where body day
  out: side door fit line put going
  any: where thing one body way
  grand: mother father son daughter ma pa parent stand
  week: end day
  bath: room tub water robe
  fire: work fly man place wood side
  honey: bee comb moon
  note: book pad paper
  gold: fish smith
  head: ache band phones teacher light line
  pine: apple cone
  black: board bird berry out smith
  hedge: hog
  day: light time dream
  eye: brow lid ball lash sight
  cow: boy girl shed
  post: man box card code
  hair: cut brush dryer style
  light: house bulb
  moon: light beam walk
  tea: pot cup spoon time
  back: pack yard ground bone
  skate: board park
  wind: mill screen storm surf
`
  .trim()
  .split('\n')
  .map((l) => l.trim().split(':'))
  .map(([first, rest]) => [first, new Set(rest.trim().split(/\s+/))]);
const COMPOUNDS = new Map(COMPOUND_LIST);
export const makesCompound = (first, second) => !!COMPOUNDS.get(first.toLowerCase())?.has(second.toLowerCase());
export const knowsCompounds = (first) => COMPOUNDS.has(first.toLowerCase());
