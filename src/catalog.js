// Things Freddie can earn in the shop. Prices are in coins; some items also
// need a level so there's always something to work towards.

export const SHIRTS = [
  { id: 'shirt-blue', name: 'Sky Blue', color: 0x2f7cf6, price: 0 },
  { id: 'shirt-red', name: 'Lava Red', color: 0xe8423f, price: 40 },
  { id: 'shirt-green', name: 'Creeper Green', color: 0x2fbf71, price: 40 },
  { id: 'shirt-orange', name: 'Blaze Orange', color: 0xff8c1a, price: 60 },
  { id: 'shirt-purple', name: 'Galaxy Purple', color: 0x8a4fff, price: 80 },
  { id: 'shirt-black', name: 'Ninja Black', color: 0x24262e, price: 120, level: 3 },
  { id: 'shirt-gold', name: 'Legend Gold', color: 0xffc531, price: 400, level: 6 },
];

export const HATS = [
  { id: 'hat-none', name: 'No hat', icon: '🙂', price: 0 },
  { id: 'hat-cap', name: 'Cool Cap', icon: '🧢', price: 80 },
  { id: 'hat-phones', name: 'Headphones', icon: '🎧', price: 150, level: 2 },
  { id: 'hat-wizard', name: 'Wizard Hat', icon: '🧙', price: 250, level: 3 },
  { id: 'hat-viking', name: 'Viking Helmet', icon: '⚔️', price: 350, level: 4 },
  { id: 'hat-crown', name: 'Royal Crown', icon: '👑', price: 600, level: 6 },
];

export const TRAILS = [
  { id: 'trail-none', name: 'No trail', icon: '·', price: 0 },
  { id: 'trail-spark', name: 'Sparkles', icon: '✨', price: 150, level: 2, colors: [0xffffff, 0xfff3a8, 0x9cf0ff] },
  { id: 'trail-fire', name: 'Fire', icon: '🔥', price: 350, level: 4, colors: [0xff5a1f, 0xffb21f, 0xffe066] },
  { id: 'trail-rainbow', name: 'Rainbow', icon: '🌈', price: 700, level: 7, colors: [0xe8423f, 0xff8c1a, 0xffc531, 0x2fbf71, 0x2f7cf6, 0x8a4fff] },
];

export const ALL_ITEMS = [...SHIRTS, ...HATS, ...TRAILS];
export const ITEM = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));
