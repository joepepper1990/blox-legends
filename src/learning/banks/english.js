// Authored items for the Word zone (Year 3 Autumn): statutory spellings,
// prefixes, adding -ly, a or an, conjunctions, prepositions and adverbs.
// Item ids are stable (they're in the learning log). `level` 1–3 is how hard
// the item is. Every item is checked by the separate rules in
// check/english.js, and a test proves no misspelling is a real word.
import { registerIds } from '../ids.js';

// ---- Year 3/4 statutory spelling list ----
// W(word, sentence, misspellings, level). Each misspelling ends with the
// kind of slip it shows:
//   :d  a double letter missed or added     :s  spelt the way it sounds
//   :t  a silent letter left out             :o  letters in the wrong order
const W = (word, sentence, wrong, level = 2) => ({
  id: `sp.${word.toLowerCase()}`,
  word,
  sentence,
  wrong: wrong.map((w) => ({ v: w.split(':')[0], kind: w.split(':')[1] })),
  level,
});

export const SPELLINGS = [
  W('accident', 'There was an accident on the road.', ['acident:d', 'accsident:s', 'axident:s'], 2),
  W('accidentally', 'I accidentally dropped my drink.', ['acidentally:d', 'accidentaly:d', 'axidentally:s'], 3),
  W('actual', 'This is the actual size of a mouse.', ['acshual:s', 'actural:s', 'actuel:s'], 2),
  W('actually', 'I actually like broccoli.', ['actualy:d', 'acshually:s', 'actuly:s'], 2),
  W('address', 'Write your address on the envelope.', ['adress:d', 'addres:d', 'addrese:s'], 2),
  W('answer', 'Put up your hand to answer.', ['anser:t', 'answere:s', 'ansewr:o'], 1),
  W('appear', 'Stars appear at night.', ['apear:d', 'appeer:s', 'appere:s'], 1),
  W('arrive', 'The train will arrive soon.', ['arive:d', 'arrieve:o', 'arryve:s'], 1),
  W('believe', 'I believe you.', ['beleive:o', 'beleve:s', 'beleeve:s'], 2),
  W('bicycle', 'She rode her bicycle to school.', ['bicicle:s', 'bycycle:s', 'bicycel:o'], 2),
  W('breath', 'Take a deep breath.', ['breth:s', 'braeth:o', 'bretth:d'], 2),
  W('breathe', 'Fish breathe under water.', ['breethe:s', 'breeth:s', 'brethe:s'], 2),
  W('build', 'Let’s build a sandcastle.', ['bild:s', 'biuld:o', 'buld:s'], 1),
  W('busy', 'The shop was very busy.', ['bizy:s', 'busey:s', 'buisy:o'], 1),
  W('business', 'Her business sells bikes.', ['buisness:o', 'bisness:s', 'busness:s'], 3),
  W('calendar', 'Look at the calendar to find the date.', ['calandar:s', 'calendur:s', 'callendar:d'], 2),
  W('caught', 'He caught the ball.', ['cought:o', 'cawght:s', 'caut:t'], 1),
  W('centre', 'Stand in the centre of the circle.', ['sentre:s', 'cenntre:d', 'centrre:d'], 2),
  W('century', 'A century is one hundred years.', ['sentury:s', 'centery:s', 'centuary:s'], 2),
  W('certain', 'Are you certain it’s your turn?', ['sertain:s', 'certin:s', 'certan:s'], 2),
  W('circle', 'Draw a circle round the answer.', ['sircle:s', 'circel:o', 'cirkle:s'], 1),
  W('complete', 'Complete the puzzle.', ['complet:s', 'compleet:s', 'compleete:s'], 2),
  W('consider', 'Consider all the choices first.', ['concider:s', 'considder:d', 'considor:s'], 3),
  W('continue', 'Continue reading to the end.', ['contenue:s', 'continew:s', 'contineu:o'], 2),
  W('decide', 'You can decide which game to play.', ['deside:s', 'decied:o', 'descide:s'], 1),
  W('describe', 'Describe your favourite animal.', ['discribe:s', 'descibe:t', 'descripe:s'], 2),
  W('different', 'Each snowflake is different.', ['diffrent:s', 'diferent:d', 'differant:s'], 2),
  W('difficult', 'This puzzle is difficult.', ['dificult:d', 'difficalt:s', 'diffikult:s'], 2),
  W('disappear', 'Watch the coin disappear!', ['dissapear:d', 'disapear:d', 'dissappear:d'], 3),
  W('early', 'We woke up early.', ['erly:s', 'earley:s', 'urly:s'], 1),
  W('earth', 'The Earth goes round the Sun.', ['erth:s', 'urth:s', 'eerth:s'], 1),
  W('eight', 'A spider has eight legs.', ['eigth:o', 'eigt:t', 'eite:s'], 1),
  W('eighth', 'It’s my eighth birthday.', ['eigthh:o', 'eightth:d', 'aighth:s'], 2),
  W('enough', 'Have you had enough to eat?', ['enuff:s', 'enogh:t', 'enouhg:o'], 2),
  W('exercise', 'Exercise keeps you healthy.', ['excercise:s', 'exersise:s', 'exercize:s'], 2),
  W('experience', 'The trip was a great experience.', ['experiance:s', 'expirience:s', 'experence:s'], 3),
  W('experiment', 'We did a science experiment.', ['expeariment:s', 'experimant:s', 'expiriment:s'], 3),
  W('extreme', 'The desert has extreme heat.', ['extream:s', 'extreem:s', 'exstreme:s'], 2),
  W('famous', 'She is a famous singer.', ['famus:s', 'faymous:s', 'famouse:s'], 1),
  W('favourite', 'Blue is my favourite colour.', ['favourit:s', 'faverite:s', 'favouret:s'], 2),
  W('February', 'February is the shortest month.', ['Febuary:t', 'Februery:s', 'Febrary:s'], 3),
  W('forward', 'Take one step forward.', ['foward:t', 'forwerd:s', 'forword:s'], 2),
  W('forwards', 'The car rolled forwards.', ['fowards:t', 'forwerds:s', 'forwords:s'], 2),
  W('fruit', 'An apple is a fruit.', ['froot:s', 'frute:s', 'fruite:s'], 1),
  W('grammar', 'We learn grammar in English.', ['grammer:s', 'gramar:d', 'grammur:s'], 2),
  W('group', 'Work in a group of four.', ['groop:s', 'groupe:s', 'grup:s'], 1),
  W('guard', 'A guard stood at the gate.', ['gard:t', 'guarde:s', 'gaurd:o'], 2),
  W('guide', 'The guide showed us the castle.', ['gide:t', 'giude:o', 'guyde:s'], 2),
  W('heard', 'I heard a noise.', ['heared:s', 'hurd:s', 'haerd:o'], 1),
  W('heart', 'Your heart pumps blood.', ['harte:s', 'haert:o', 'heert:s'], 1),
  W('height', 'Measure your height.', ['hieght:o', 'hite:s', 'heigth:o'], 2),
  W('history', 'We learn about castles in history.', ['histry:s', 'histery:s', 'histroy:o'], 1),
  W('imagine', 'Imagine you can fly.', ['imajine:s', 'immagine:d', 'imagin:s'], 2),
  W('increase', 'The price will increase.', ['increese:s', 'inkrease:s', 'increace:s'], 2),
  W('important', 'It’s important to listen.', ['importent:s', 'importint:s', 'impotant:s'], 2),
  W('interest', 'Dinosaurs interest me.', ['intrest:s', 'interist:s', 'intrist:s'], 2),
  W('island', 'They sailed to an island.', ['iland:t', 'ilend:s', 'islund:s'], 2),
  W('knowledge', 'Books give us knowledge.', ['knowlege:t', 'nowledge:t', 'knowledg:s'], 3),
  W('learn', 'We learn something new each day.', ['lern:s', 'leern:s', 'lurn:s'], 1),
  W('length', 'Measure the length of the table.', ['lenth:s', 'lenght:o', 'lengh:s'], 2),
  W('library', 'I borrowed a book from the library.', ['libary:t', 'libery:s', 'librery:s'], 2),
  W('material', 'Wool is a soft material.', ['matirial:s', 'meterial:s', 'materal:s'], 2),
  W('medicine', 'The doctor gave me medicine.', ['medecine:s', 'medisine:s', 'medicin:s'], 2),
  W('mention', 'Did she mention the party?', ['menshun:s', 'mension:s', 'mentoin:o'], 2),
  W('minute', 'Wait a minute.', ['minit:s', 'minnute:d', 'minite:s'], 1),
  W('natural', 'Wood is a natural material.', ['nateral:s', 'natchural:s', 'naturel:s'], 2),
  W('naughty', 'The naughty puppy chewed my shoe.', ['norty:s', 'naugty:t', 'nawty:s'], 2),
  W('notice', 'Did you notice the rainbow?', ['notise:s', 'notis:s', 'noticce:d'], 1),
  W('occasion', 'A wedding is a special occasion.', ['ocassion:d', 'occassion:d', 'ocasion:d'], 3),
  W('occasionally', 'We occasionally eat out.', ['occasionaly:d', 'ocasionally:d', 'occassionally:d'], 3),
  W('often', 'I often walk to school.', ['offen:t', 'ofen:s', 'oftern:s'], 1),
  W('opposite', 'Hot is the opposite of cold.', ['oposite:d', 'opposit:s', 'oppersite:s'], 2),
  W('ordinary', 'It was an ordinary day.', ['ordinery:s', 'ordnary:s', 'oridnary:o'], 2),
  W('particular', 'Do you want a particular colour?', ['perticular:s', 'particuler:s', 'partikular:s'], 3),
  W('peculiar', 'What a peculiar smell!', ['pecular:s', 'peculier:s', 'pekuliar:s'], 3),
  W('perhaps', 'Perhaps it will snow.', ['perhapps:d', 'perraps:s', 'prehaps:o'], 2),
  W('popular', 'Football is a popular sport.', ['populer:s', 'poppular:d', 'popula:s'], 2),
  W('position', 'Get into position for the race.', ['posision:s', 'possition:d', 'posishun:s'], 2),
  W('possess', 'Do you possess a pencil?', ['posess:d', 'possees:o', 'pozess:s'], 3),
  W('possession', 'This toy is my favourite possession.', ['posession:d', 'possesion:d', 'posesion:d'], 3),
  W('possible', 'Is it possible to fly?', ['possable:s', 'posible:d', 'possibel:o'], 2),
  W('potatoes', 'We had potatoes for tea.', ['potaytoes:s', 'potatose:o', 'pottatoes:d'], 2),
  W('pressure', 'Press with gentle pressure.', ['presure:d', 'pressur:s', 'preshure:s'], 2),
  W('probably', 'It will probably rain.', ['probly:s', 'probabley:s', 'probabaly:o'], 2),
  W('promise', 'I promise to help.', ['promis:s', 'promice:s', 'prommise:d'], 1),
  W('purpose', 'What is the purpose of this button?', ['perpose:s', 'purpos:s', 'purpuse:s'], 2),
  W('quarter', 'Cut the cake into quarters. Take a quarter.', ['quater:s', 'qwarter:s', 'quorter:s'], 2),
  W('question', 'Ask a question.', ['queston:t', 'qestion:t', 'questoin:o'], 1),
  W('recent', 'This is a recent photo.', ['reecent:s', 'recint:s', 'resant:s'], 2),
  W('regular', 'Brush your teeth at regular times.', ['reguler:s', 'regualr:o', 'regulor:s'], 2),
  W('reign', 'The queen’s reign was long.', ['raign:s', 'riegn:o', 'reighn:s'], 3),
  W('remember', 'Remember to bring your bag.', ['remeber:t', 'rember:s', 'remembor:s'], 1),
  W('sentence', 'Write a sentence about your day.', ['sentance:s', 'sentense:s', 'sentince:s'], 2),
  W('separate', 'Keep the red and blue bricks separate.', ['seperate:s', 'seprate:s', 'separete:s'], 3),
  W('special', 'Today is a special day.', ['speshal:s', 'specal:s', 'speacial:o'], 2),
  W('straight', 'Draw a straight line.', ['straigt:t', 'strate:s', 'staight:t'], 2),
  W('strange', 'We heard a strange sound.', ['strainge:s', 'stange:t', 'straynge:s'], 1),
  W('strength', 'Lifting rocks takes strength.', ['strenth:s', 'strenght:o', 'stength:t'], 3),
  W('suppose', 'I suppose we could go.', ['supose:d', 'suppoze:s', 'suppos:s'], 2),
  W('surprise', 'The party was a surprise.', ['suprise:t', 'surprice:s', 'serprise:s'], 2),
  W('therefore', 'It is raining, therefore we will stay in.', ['therfore:t', 'therefour:s', 'thairfore:s'], 3),
  W('though', 'It was sunny, though cold.', ['thogh:t', 'thow:s', 'thoguh:o'], 3),
  W('although', 'I went out although it was raining.', ['althogh:t', 'allthough:d', 'althow:s'], 2),
  W('thought', 'I thought about my answer.', ['thort:s', 'thougt:t', 'thougth:o'], 2),
  W('through', 'We walked through the woods.', ['throgh:t', 'throuh:t', 'thruogh:o'], 2),
  W('various', 'There are various colours to choose from.', ['varius:s', 'vairious:s', 'varous:s'], 3),
  W('weight', 'What is the weight of the bag?', ['wieght:o', 'weigt:t', 'waight:s'], 2),
  W('woman', 'A woman sat on the bench.', ['womun:s', 'wooman:s', 'womman:d'], 1),
  W('women', 'Two women ran the race.', ['wemen:s', 'womin:s', 'wimen:s'], 2),
];

// ---- prefixes un-, dis-, mis-, re-, in-, im- ----
// P(prefix, root, wrong prefixes, level). A wrong prefix never makes a word
// found in a 275,000-word English dictionary (checked by tests/english.test.js).
const P = (prefix, root, wrong, level = 1) => ({ id: `pre.${prefix}${root}`, prefix, root, word: prefix + root, wrong, level });
export const PREFIXED = [
  P('un', 'happy', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'kind', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'lock', ['dis', 'mis', 'im']),
  P('un', 'tidy', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'fair', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'well', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'safe', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'zip', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'pack', ['dis', 'mis', 'in', 'im']),
  P('un', 'usual', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'friendly', ['dis', 'mis', 're', 'in', 'im'], 2),
  P('un', 'lucky', ['dis', 'mis', 're', 'in', 'im']),
  P('un', 'able', ['mis', 're', 'in', 'im']),
  P('dis', 'agree', ['un', 'mis', 're', 'in', 'im']),
  P('dis', 'appear', ['un', 'mis', 'in', 'im']),
  P('dis', 'like', ['re', 'in', 'im']),
  P('dis', 'obey', ['un', 'mis', 're', 'in', 'im'], 2),
  P('dis', 'honest', ['mis', 're', 'in', 'im'], 2),
  P('dis', 'connect', ['un', 'in', 'im'], 2),
  P('dis', 'trust', ['re', 'im'], 2),
  P('dis', 'approve', ['un', 'mis', 'in', 'im'], 3),
  P('mis', 'behave', ['un', 'dis', 're', 'in', 'im']),
  P('mis', 'spell', ['dis', 'in', 'im']),
  P('mis', 'lead', ['dis', 're', 'in', 'im'], 2),
  P('mis', 'place', ['in', 'im'], 2),
  P('mis', 'count', ['un', 'in', 'im'], 2),
  P('mis', 'hear', ['un', 'dis', 'in', 'im'], 2),
  P('mis', 'judge', ['un', 'dis', 'in', 'im'], 3),
  P('mis', 'understand', ['un', 'dis', 're', 'in', 'im'], 3),
  P('re', 'build', ['dis', 'in', 'im']),
  P('re', 'play', ['un', 'in', 'im']),
  P('re', 'fill', ['un', 'dis', 'mis', 'im']),
  P('re', 'paint', ['dis', 'in']),
  P('re', 'write', ['dis', 'in', 'im']),
  P('re', 'visit', ['un', 'dis', 'mis', 'in', 'im']),
  P('re', 'start', ['un', 'dis', 'in', 'im']),
  P('re', 'tell', ['un', 'dis', 'in', 'im']),
  P('re', 'heat', ['un', 'dis', 'mis', 'in', 'im'], 2),
  P('re', 'use', ['un', 'in', 'im'], 2),
  P('in', 'correct', ['un', 'dis', 're', 'im'], 2),
  P('in', 'active', ['dis', 'mis', 'im'], 2),
  P('in', 'visible', ['un', 'dis', 'mis', 're', 'im'], 2),
  P('in', 'complete', ['un', 'dis', 'mis', 're', 'im'], 2),
  P('in', 'expensive', ['dis', 'mis', 're', 'im'], 3),
  P('in', 'accurate', ['un', 'dis', 'mis', 're', 'im'], 3),
  P('in', 'dependent', ['un', 'dis', 'mis', 're', 'im'], 3),
  P('im', 'possible', ['dis', 'mis', 're', 'in']),
  P('im', 'patient', ['un', 'dis', 'mis', 're'], 2),
  P('im', 'polite', ['dis', 'mis', 're', 'in'], 2),
  P('im', 'perfect', ['dis', 'mis', 're', 'in'], 2),
  P('im', 'mature', ['un', 'dis', 'mis', 're', 'in'], 3),
  P('im', 'practical', ['dis', 'mis', 're', 'in'], 3),
  P('im', 'mobile', ['un', 'dis', 'mis', 're', 'in'], 3),
];

// ---- adding -ly ----
// L(word, level): the right spelling is worked out by the rules in
// check/english.js; the generator makes the classic wrong ones.
const L = (word, level = 1) => ({ id: `ly.${word}`, word, level });
export const LY_WORDS = [
  ...'sad slow quick kind brave loud soft proud sudden careful bright neat calm polite safe clever'.split(' ').map((w) => L(w, 1)),
  ...'happy angry lucky easy busy noisy hungry lazy greedy merry'.split(' ').map((w) => L(w, 2)),
  ...'gentle simple humble terrible horrible possible comfortable sensible'.split(' ').map((w) => L(w, 2)),
  ...'basic dramatic magic tragic'.split(' ').map((w) => L(w, 3)),
  ...'true whole shy'.split(' ').map((w) => L(w, 3)),
  ...'final usual real cheerful beautiful'.split(' ').map((w) => L(w, 2)),
];

// ---- a or an ----
// Words that need "an" (a vowel sound) and words that need "a" (a consonant
// sound), with the tricky ones where the first letter misleads.
export const AN_WORDS = 'apple egg owl umbrella ink igloo elephant orange ant octopus uncle insect eagle iceberg arm oven envelope astronaut'.split(' ');
export const AN_TRICKY = ['hour', 'honest', 'heir'];
export const A_WORDS = 'cat dog house horse banana tree rabbit pencil window ladder sock garden'.split(' ');
export const A_TRICKY = ['unicorn', 'uniform', 'ukulele', 'unit', 'one'];
const AAN = (word, level) => ({ id: `aan.${word}`, word, level });
export const AAN_ITEMS = [
  ...AN_WORDS.map((w) => AAN(w, 1)),
  ...A_TRICKY.map((w) => AAN(w, 2)),
  ...AN_TRICKY.map((w) => AAN(w, 3)),
];

// ---- conjunctions ----
// K(id, sentence with ___, answer, three wrong joining words, level)
const K = (id, text, answer, wrong, level = 1) => ({ id: `conj.${id}`, text, answer, wrong, level });
export const CONJUNCTIONS = [
  K('coat', 'I wore my coat ___ it was cold.', 'because', ['although', 'so', 'or']),
  K('baby', 'The baby cried ___ she was hungry.', 'because', ['although', 'so', 'or']),
  K('window', 'We shut the window ___ it was noisy outside.', 'because', ['although', 'so', 'or']),
  K('tired', 'Sam was tired ___ he had run all the way home.', 'because', ['although', 'so', 'or'], 2),
  K('thirsty', 'Ella drank some water ___ she was thirsty.', 'because', ['although', 'so', 'or']),
  K('beach', 'We went to the beach ___ it was raining.', 'although', ['because', 'so', 'or'], 2),
  K('race', 'Mia finished the race ___ her leg hurt.', 'although', ['because', 'so', 'or'], 2),
  K('tea', 'The tea was still hot ___ it had been there for an hour.', 'although', ['because', 'so', 'or'], 3),
  K('pie', 'Tom ate the whole pie ___ he said he was full.', 'although', ['because', 'so', 'or'], 2),
  K('dark', 'It was getting dark, ___ we went home.', 'so', ['although', 'because', 'or'], 2),
  K('hungry', 'I was hungry, ___ I made a sandwich.', 'so', ['although', 'because', 'or']),
  K('rain', 'It started to rain, ___ we put up our umbrellas.', 'so', ['although', 'because', 'or']),
  K('late', 'The bus was late, ___ we missed the start of the film.', 'so', ['although', 'because', 'or'], 2),
  K('hurry', 'Hurry up, ___ you will miss the bus!', 'or', ['although', 'because', 'so'], 3),
  K('coldOr', 'Put your coat on, ___ you will get cold.', 'or', ['although', 'because', 'so'], 3),
  K('teeth', 'Brush your teeth ___ you go to bed.', 'before', ['although', 'because', 'or'], 2),
  K('wash', 'Wash your hands ___ you eat.', 'before', ['although', 'or', 'so'], 2),
  K('dinner', 'You can play ___ you have eaten your dinner.', 'after', ['although', 'or', 'so'], 3),
];

// ---- prepositions of time and place: in, on or at ----
// G(id, sentence with ___, level). The answer comes from the rules in
// check/english.js (and the bank's own `answer`, which must agree).
const G = (id, text, answer, level = 1) => ({ id: `prep.${id}`, text, answer, level });
export const PREPOSITIONS = [
  G('saturday', 'We go swimming ___ Saturday.', 'on'),
  G('monday', 'School starts again ___ Monday.', 'on'),
  G('birthday', 'I had a party ___ my birthday.', 'on'),
  G('christmasday', 'We open presents ___ Christmas Day.', 'on', 2),
  G('fridaymorning', 'The trip is ___ Friday morning.', 'on', 2),
  G('july', 'Sports day is ___ July.', 'in'),
  G('winter', 'It often snows ___ winter.', 'in'),
  G('summer', 'We go camping ___ the summer.', 'in'),
  G('morning', 'I have breakfast ___ the morning.', 'in'),
  G('evening', 'We read a story ___ the evening.', 'in'),
  G('year', 'My cousin was born ___ 2019.', 'in', 2),
  G('afternoon', 'We have art ___ the afternoon.', 'in'),
  G('night', 'Owls hunt ___ night.', 'at'),
  G('three', 'The film starts ___ three o’clock.', 'at'),
  G('halfpast', 'Lunch is ___ half past twelve.', 'at', 2),
  G('lunchtime', 'We play football ___ lunchtime.', 'at'),
  G('bedtime', 'I read a book ___ bedtime.', 'at'),
  G('midnight', 'The clock chimes ___ midnight.', 'at', 2),
  G('noon', 'The shop shuts ___ noon on Sundays.', 'at', 3),
  G('bus', 'We sat together ___ the bus.', 'on', 2),
  G('train', 'I read my comic ___ the train.', 'on', 2),
  G('plane', 'We ate our lunch ___ the plane.', 'on', 2),
  G('car', 'We sang songs ___ the car on the way home.', 'in', 2),
  G('kitchen', 'Dad is cooking ___ the kitchen.', 'in'),
  G('garden', 'We had a picnic ___ the garden.', 'in'),
  G('bed', 'I was still ___ bed when the alarm rang.', 'in', 2),
  G('home', 'We stayed ___ home all day.', 'at', 2),
  G('busstop', 'We waited ___ the bus stop.', 'at', 2),
  G('june', 'Our holiday is ___ June.', 'in'),
];

// ---- adverbs ----
// Manner: the -ly adverb against its describing word and naming word.
// R(id, sentence with ___, adverb, adjective, noun, level)
const R = (id, text, answer, adj, noun, level = 1) => ({ id: `adv.${id}`, text, answer, wrong: [adj, noun], kind: 'manner', level });
// Time: the adverb that fits the time of the sentence.
// T(id, sentence, answer, wrong adverbs, level)
const T = (id, text, answer, wrong, level = 2) => ({ id: `adv.${id}`, text, answer, wrong, kind: 'time', level });
export const ADVERBS = [
  R('spoke', 'She spoke ___ to the teacher.', 'politely', 'polite', 'politeness'),
  R('door', 'He closed the door ___.', 'gently', 'gentle', 'gentleness'),
  R('slept', 'The baby slept ___.', 'peacefully', 'peaceful', 'peace'),
  R('sang', 'The choir sang ___.', 'beautifully', 'beautiful', 'beauty'),
  R('waited', 'We waited ___ for the bus.', 'patiently', 'patient', 'patience'),
  R('shouted', 'The man shouted ___ at the wasp.', 'angrily', 'angry', 'anger'),
  R('carried', 'Carry the eggs ___.', 'carefully', 'careful', 'care'),
  R('played', 'The children played ___ together.', 'happily', 'happy', 'happiness', 2),
  R('swam', 'The dolphin swam ___ through the waves.', 'gracefully', 'graceful', 'grace', 2),
  R('marched', 'The soldiers marched ___ past the crowd.', 'proudly', 'proud', 'pride', 2),
  R('ate', 'The dog ate ___.', 'greedily', 'greedy', 'greed', 2),
  R('opened', 'He ___ opened his presents.', 'eagerly', 'eager', 'eagerness', 2),
  R('crept', 'The cat crept ___ towards the bird.', 'silently', 'silent', 'silence', 2),
  R('fought', 'The knight fought ___.', 'bravely', 'brave', 'bravery', 3),
  R('whispered', 'Tia whispered ___ to her friend.', 'secretly', 'secret', 'secrecy', 3),
  R('stopped', 'The car stopped ___.', 'suddenly', 'sudden', 'suddenness', 3),
  T('yesterday', '___ we went to the zoo.', 'Yesterday', ['Tomorrow', 'Soon'], 2),
  T('tomorrow', 'We will visit Gran ___.', 'tomorrow', ['yesterday', 'already'], 2),
  T('snowed', 'It snowed ___.', 'yesterday', ['tomorrow', 'soon'], 2),
  T('soon', 'The film will start ___.', 'soon', ['yesterday', 'already'], 2),
  T('already', 'I have ___ finished my book.', 'already', ['tomorrow', 'yesterday'], 3),
  T('later', 'We will tidy up ___.', 'later', ['yesterday', 'already'], 3),
];

registerIds('items', [...SPELLINGS, ...PREFIXED, ...LY_WORDS, ...AAN_ITEMS, ...CONJUNCTIONS, ...PREPOSITIONS, ...ADVERBS].map((i) => i.id));
