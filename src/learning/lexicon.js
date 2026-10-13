// Curated, child-friendly word lists for letter codes and mirror codes.
// Every word is a common English word a Year 3 reader knows.
const w = (s) => s.trim().split(/\s+/);

export const WORDS3 = w(`
  ant ape arm art bag bat bed bee big bin box boy bud bug bun bus cab can cap
  car cat cow cub cup cut day den dig dog dot dry ear egg elf end eye fan fig
  fin fit fix fly fog fox fun fur gap gem gum hat hen hip hop hot hug hut ice
  ink jam jar jet jog joy key kid kit lap leg lid log map mat mix mop mud mug
  net nut oak owl pan pen pet pie pig pin pit pod pot rag ram rat red rib rod
  rug run saw sea set sip sit six sky spy sum sun tag tap ten tin tip toe top
  toy tub tug two van vet wax web wet wig win yak yes zip zoo
`);

export const WORDS4 = w(`
  back ball band bank barn bath bead beak bear bell belt bike bird boat bone
  book boot bowl bush cake calf camp cape card cart cave chip city clap claw
  clay coat coin cold comb cone cook corn crab crew crop cube dark deer desk
  dice dish dive dock doll door dove drum duck dust edge face farm fast film
  fish flag flat foot fork frog game gate gift glow goal goat gold grin hand
  harp hawk heat hide hill hive hole hook horn hose iron jump kite knot lamb
  lamp leaf lion lock mask milk mint moon moth nest note oven page park path
  pear pink plan plum pond pool quiz raft rain ring road rock roof rope rose
  sail sand seed ship shoe shop sing snow sock soup star step swan tail tank
  tent toad tree twin wall wave wind wing wolf wood wool yard yawn zero
`);

export const WORDS5 = w(`
  apple beach bread brick brush cabin camel candy chair chalk cloud clock
  crown daisy dream eagle earth fairy field flame flute fruit ghost giant
  globe grape grass heart horse house juice jelly knife koala lemon light
  magic mango maple money motor mouse music night ocean otter paint panda
  party peach piano pilot pizza plant puppy queen quilt river robin robot
  salad scarf sheep shell skate smile snake space spoon sport stone storm
  sugar sweet table tiger toast torch tower train truck water whale wheel
  zebra
`);

export const WORDS = [...WORDS3, ...WORDS4, ...WORDS5];
export const isWord = (s) => WORDS_SET.has(String(s).toLowerCase());
const WORDS_SET = new Set(WORDS);
