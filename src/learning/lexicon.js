// Curated, child-friendly word lists for letter codes and mirror codes.
// Every word is a common English word a Year 3 reader knows (and is checked
// against a full dictionary by tests). The lists are long enough that a
// heavy player still meets new mirror and code words for months.
const w = (s) => s.trim().split(/\s+/);

export const WORDS3 = w(`
  ant ape arm art bag bat bed bee big bin box boy bud bug bun bus cab can cap
  car cat cow cub cup cut day den dig dog dot dry ear egg elf end eye fan fig
  fin fit fix fly fog fox fun fur gap gem gum hat hen hip hop hot hug hut ice
  ink jam jar jet jog joy key kid kit lap leg lid log map mat mix mop mud mug
  net nut oak owl pan pen pet pie pig pin pit pod pot rag ram rat red rib rod
  rug run saw sea set sip sit six sky spy sum sun tag tap ten tin tip toe top
  toy tub tug two van vet wax web wet wig win yak yes zip zoo
  add age ago aid aim air all and any arc ask bad bar bay bit bow but buy cot
  cry cue dad did dim dip doe due dug dye eat eel elk emu era fed few fib fry
  gas get got gym had ham has hay her hid him his hit hob hoe how ivy jaw jug
  kin lab lad law lay led let lip lit lot low mad man may men met mid mob mow
  mum nap new nod nor not now oar odd off oil old one our out own pad pal pat
  paw pay pea peg pop pup put rap raw ray rid rim rip row rub sad sat say see
  sew she shy sir sob son sow spa tab tan tar tea tie ton too tow try urn use
  vat was way wed who why wit wok won wow yam yap yew yet you zap
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
  able also arch area army aunt away baby bake bark base bean beef been bend
  best bill bite blue blow body boil bold bolt born both bump burn buzz cage
  calm came care cash cell chat chin chop clip club clue coal cool copy cord
  cosy crib cute dart dash date dawn deal deep dent dine dirt does done down
  drag draw drip drop dull dune each east easy echo even exit fair fall fame
  feed feel fern fill find fine fire firm fist five flip flow foal foam fold
  folk food fool form fort four free from fuel full fuss gain gale gave gear
  germ give glad glue gown grab gran grey grip grow gulp hail hair half hall
  hang hard have head heal hear help herb here hero high hike hint hold home
  hood hoop hope hour huge hunt idea inch into itch jazz join joke junk just
  keen keep kick kind king kiss knee knit know lace lake land lane last late
  lawn lazy lead lean lend less lick life lift like lily lime line link list
  live load loaf long look loop lost loud love luck made mail main make many
  mark mash mate maze meal meet melt mess mice mild mile mind mine miss mist
  mole more most move much mule must nail name near neat neck need news next
  nice nine nose oats once only open oval over pack paid pail pair palm past
  pave peak peel pest pick pier pile pill pine pipe plot plus poem pole pony
  poor port post pour pram prop puff pull pump pure push race rack rail rake
  ramp read real reed reef rest rice rich ride rink ripe rise robe roll room
  root rule rush rust safe sale salt same save seal seat seen sell send shed
  shin show shut side sign silk sink size skip sled slid slim slip slot slow
  slug snap snug soap sofa soft soil sold some song soon sort spin spot stem
  stew stop such suit sung sure swim take tale talk tall tame tape task team
  tell tend term test text than that them then they thin this tick tide tidy
  tile time tiny told tone took tool torn town trap tray trip true tube tune
  turn tusk type unit upon used vase vest view vine vote wade wait wake walk
  want warm wash wasp weed week well went were west what when whip wide wild
  will wink wipe wire wise wish with word wore work worm wrap yell yolk your
  zone zoom
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
  about above actor adult after again alarm album alien alive angry ankle
  apron arena arrow award awake bacon badge baker basin beard begin being
  bench berry bingo birth black blade blank blaze blend blink block bloom
  board bonus booth bound brain brake brave bride brief bring broom brown
  buddy build bunch bunny cable carry catch cause chain champ chase cheek
  cheer chess chest chick chief child chill choir claim class clean clear
  cliff climb cloak close cloth clown coach coast comic coral couch count
  cover crane crash crawl cream creek crisp cross crowd crumb curly curve
  cycle dance delay depth diary dizzy dough dozen drain drama drawn dress
  drill drink drive early eight elbow empty enjoy enter equal extra fable
  fancy feast fence ferry fifty final first flash fleet float flock floor
  flour focus foggy force forty found frame fresh front frost funny fuzzy
  glass glove goose grade grain grand great green greet grill group guard
  guess guest guide habit happy heavy hedge hello hobby honey hotel human
  hurry igloo image jolly judge kayak knock label laugh layer learn level
  limit llama local lodge lucky lunch march match medal melon metal mixer
  model month mouth movie muddy nerve never ninja noise north novel nurse
  offer olive onion opera orbit order owner paper pasta patch peace pearl
  pedal penny piece place plain plane plate point polar porch pouch power
  press price pride print prize proud purse quick quiet radio raven reach
  ready relay rhyme rider right rocky round royal rugby ruler sauce scale
  scene scoop score scout shade shape share shark sharp shelf shine shiny
  shirt shore short shout sight skill skirt sleep slide smart smell smoke
  snack snail sound spade spark speak speed spell spend spice spray stage
  stair stamp stand steam steel stick still stool story stove straw sunny
  super swing sword taste teach teeth thank thick thing think three throw
  thumb title today tooth topic total touch tough track trade treat trick
  trunk truth tulip uncle under until upset usual value video visit voice
  wagon waste watch wheat white whole woman world worry write yacht young
  youth
`);

export const WORDS = [...WORDS3, ...WORDS4, ...WORDS5];
export const isWord = (s) => WORDS_SET.has(String(s).toLowerCase());
const WORDS_SET = new Set(WORDS);
