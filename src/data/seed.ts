import type { AppState, Category, MenuItem, ModifierOption } from '@/lib/types';

/**
 * STRUCTURE / BUILD-TEST SEED.
 * Source: the repo's existing index.html PRICES object (38 base items + 18 priced modifiers),
 * extracted in Phase 1. The reconciled production catalog is being approved separately and can
 * replace this file in one step. Do not treat this as the final POS reconciliation.
 * Dubai Donut is the one explicit placeholder below: $4.99, marked pending confirmation.
 */
export const CATEGORIES: Category[] = [
  { id: 'matcha', name: 'Matcha & Teas', tagline: 'Whisked to order · refreshment teas', accent: 'matcha' },
  { id: 'coffee', name: 'Morning Coffee', tagline: 'Iced & hot handmade espresso drinks', accent: 'sun' },
  { id: 'boba', name: 'Boba & Milk Tea', tagline: 'Pearls cooked through the morning', accent: 'blue' },
  { id: 'donuts', name: 'Handmade Donuts', tagline: 'Made fresh daily · singles & dozens', accent: 'pink' },
  { id: 'fancy', name: 'Fancy & Dossants', tagline: 'The Dubai donut & the fancy case', accent: 'cherry' },
  { id: 'rolls', name: 'Morning Rolls', tagline: 'Texas-style kolache & croissant rolls baked in-house', accent: 'brown' },
];

type ItemSeed = [string, MenuItem['categoryId'], string, string, number, Partial<MenuItem>];
const item = ([id, categoryId, subgroup, name, dollars, extra]: ItemSeed): MenuItem => ({
  id,
  categoryId,
  subgroup,
  name,
  priceCents: Math.round(dollars * 100),
  description:
    extra.description ??
    (categoryId === 'donuts' || categoryId === 'fancy'
      ? 'Made fresh daily.'
      : categoryId === 'rolls'
        ? 'Baked in-house.'
        : 'Made to order.'),
  tags: extra.tags ?? [],
  isDrink: extra.isDrink ?? ['matcha', 'coffee', 'boba'].includes(categoryId),
  isIced: extra.isIced ?? false,
  source: extra.source ?? 'repo-index.html',
  priceLabel: extra.priceLabel,
  dozenPriceCents: extra.dozenPriceCents,
  pendingConfirmation: extra.pendingConfirmation,
});

const ITEMS: MenuItem[] = [
  // Handmade Donuts — Regular (repo each/dozen)
  item(['glazed', 'donuts', 'Regular', 'Glazed', 1.59, { dozenPriceCents: 1590 }]),
  item(['sugar-donut', 'donuts', 'Regular', 'Sugar Donut', 1.59, { dozenPriceCents: 1590 }]),
  item(['chocolate-frosted', 'donuts', 'Regular', 'Chocolate Frosted', 1.69, { dozenPriceCents: 1690 }]),
  item(['filled', 'donuts', 'Regular', 'Filled', 2.09, { dozenPriceCents: 2090 }]),
  item(['sprinkle-donut', 'donuts', 'Regular', 'Sprinkle Donut', 1.89, { dozenPriceCents: 1890 }]),

  // Fancy & Dossants
  item(['cinnamon-roll', 'fancy', 'Fancy', 'Cinnamon Roll', 2.79, { dozenPriceCents: 2790 }]),
  item(['apple-fritter', 'fancy', 'Fancy', 'Apple Fritter', 2.79, { dozenPriceCents: 2790 }]),
  item(['dossant', 'fancy', 'Fancy', 'Dossant', 3.99, { dozenPriceCents: 3990, description: 'Flaky and hand-cut, made fresh daily.' }]),
  item(['fancy-donut', 'fancy', 'Fancy', 'Fancy Donut', 2.79, { priceLabel: '$2.79–$6.29', description: 'Fancy case selection, made fresh daily.' }]),
  item(['donut-holes', 'fancy', 'Fancy', 'Donut Holes', 2.79, { priceLabel: '$2.79 / dozen', description: 'Sold by the dozen, made fresh daily.' }]),
  item(['dubai-donut', 'fancy', 'Signature', 'Dubai Donut', 4.99, { tags: ['Signature', 'Most loved'], source: 'pending-confirmation', pendingConfirmation: true, description: 'Our signature Dubai donut spotlight.' }]),

  // Morning Coffee — hot
  item(['americano', 'coffee', 'Hot Coffee', 'Americano', 3.69, { description: 'Handmade espresso brew.' }]),
  item(['latte', 'coffee', 'Hot Coffee', 'Latte', 4.39, { description: 'Handmade espresso with steamed milk.' }]),
  item(['cappuccino', 'coffee', 'Hot Coffee', 'Cappuccino', 4.25, { description: 'Handmade espresso with a deep cap of foam.' }]),
  item(['espresso', 'coffee', 'Hot Coffee', 'Espresso', 1.25, { description: 'A straight handmade espresso shot.' }]),
  item(['hot-cocoa-marshmello', 'coffee', 'Hot Coffee', 'Hot Cocoa Marshmello', 3.49, { description: 'Warm cocoa for the morning table.' }]),

  // Morning Coffee — iced
  item(['iced-americano', 'coffee', 'Iced Coffee', 'Iced Americano', 3.99, { isIced: true }]),
  item(['iced-latte', 'coffee', 'Iced Coffee', 'Iced Latte', 4.69, { isIced: true }]),
  item(['iced-matcha-latte', 'coffee', 'Iced Coffee', 'Iced Matcha Latte', 5.19, { isIced: true, tags: ['House favorite'] }]),
  item(['tk-signature-iced-coffee', 'coffee', 'Iced Coffee', 'TK Signature Iced Coffee', 5.95, { isIced: true, tags: ['Signature'] }]),
  item(['iced-rose-latte', 'coffee', 'Iced Coffee', 'Iced Rose Latte', 3.69, { isIced: true }]),
  item(['iced-pistachio-latte', 'coffee', 'Iced Coffee', 'Iced Pistachio Latte', 5.69, { isIced: true }]),

  // Matcha & Teas — green / refreshment teas, all $5.89 in the repo catalog
  item(['lychee-green-tea', 'matcha', 'Refreshment Teas', 'Lychee Green Tea', 5.89, { isIced: true }]),
  item(['strawberry-green-tea', 'matcha', 'Refreshment Teas', 'Strawberry Green Tea', 5.89, { isIced: true }]),
  item(['passionfruit-green-tea', 'matcha', 'Refreshment Teas', 'Passionfruit Green Tea', 5.89, { isIced: true }]),
  item(['mango-green-tea', 'matcha', 'Refreshment Teas', 'Mango Green Tea', 5.89, { isIced: true }]),
  item(['peach-green-tea', 'matcha', 'Refreshment Teas', 'Peach Green Tea', 5.89, { isIced: true }]),
  item(['rose-green-tea', 'matcha', 'Refreshment Teas', 'Rose Green Tea', 5.89, { isIced: true }]),
  item(['mango-lychee-green-tea', 'matcha', 'Refreshment Teas', 'Mango Lychee Green Tea', 5.89, { isIced: true }]),

  // Boba & Milk Tea
  item(['green-milk-tea', 'boba', 'Milk Tea & Boba', 'Green Milk Tea', 5.89, { isIced: true }]),
  item(['black-sugar-boba-fresh-milk', 'boba', 'Milk Tea & Boba', 'Black Sugar Boba/Fresh Milk', 4.95, { isIced: true, tags: ['Customer favorite'] }]),
  item(['taro-milk-tea', 'boba', 'Milk Tea & Boba', 'Taro Milk Tea', 5.89, { isIced: true }]),
  item(['coconut-milk-tea', 'boba', 'Milk Tea & Boba', 'Coconut Milk Tea', 5.89, { isIced: true }]),

  // Morning Rolls — Texas-style kolache / sweet rolls
  item(['regular-smoked-cheese', 'rolls', 'Texas-Style Kolache', 'Regular Smoked Cheese', 3.29, {}]),
  item(['jalapeno-smoked-cheese', 'rolls', 'Texas-Style Kolache', 'Jalapeño Smoked Cheese', 3.29, {}]),
  item(['beef-smoked-no-cheese', 'rolls', 'Texas-Style Kolache', 'Beef Smoked (No Cheese)', 3.49, {}]),

  // Morning Rolls — croissant rolls
  item(['bacon-sausage-roll', 'rolls', 'Croissant Rolls', 'Bacon Sausage Roll', 4.29, {}]),
  item(['chicken-cheese-roll', 'rolls', 'Croissant Rolls', 'Chicken Cheese Roll', 3.99, {}]),
  item(['ham-swiss-cheese-roll', 'rolls', 'Croissant Rolls', 'Ham & Swiss Cheese Roll', 3.99, {}]),
];

const coffeeIds = [
  'americano', 'latte', 'cappuccino', 'espresso', 'hot-cocoa-marshmello',
  'iced-americano', 'iced-latte', 'iced-matcha-latte', 'tk-signature-iced-coffee', 'iced-rose-latte', 'iced-pistachio-latte',
];
const coffeeNoEspressoIds = coffeeIds.filter((id) => id !== 'espresso' && id !== 'hot-cocoa-marshmello');
const teaSizedIds = [
  'lychee-green-tea', 'strawberry-green-tea', 'passionfruit-green-tea', 'mango-green-tea', 'peach-green-tea', 'rose-green-tea',
  'mango-lychee-green-tea', 'green-milk-tea', 'taro-milk-tea', 'coconut-milk-tea',
];
const icedCoffeeIds = ['iced-americano', 'iced-latte', 'iced-matcha-latte', 'tk-signature-iced-coffee', 'iced-rose-latte', 'iced-pistachio-latte'];

type ModSeed = [string, ModifierOption['group'], string, string, number, Partial<ModifierOption>];
const mod = ([id, group, subgroup, name, dollars, extra]: ModSeed): ModifierOption => ({
  id,
  group,
  subgroup,
  name,
  priceCents: Math.round(dollars * 100),
  enabled: true,
  itemIds: extra.itemIds,
  categoryIds: extra.categoryIds,
  source: extra.source ?? 'repo-index.html',
});

const MODIFIERS: ModifierOption[] = [
  // Repo sizes (priced adders)
  mod(['size-small-8oz', 'size', 'Coffee sizes', 'Small 8oz', 0, { itemIds: coffeeIds }]),
  mod(['size-medium-12oz', 'size', 'Coffee sizes', 'Medium 12oz', 0.5, { itemIds: coffeeNoEspressoIds }]),
  mod(['size-large-16oz', 'size', 'Coffee sizes', 'Large 16oz', 1, { itemIds: coffeeNoEspressoIds }]),
  mod(['size-small-16oz', 'size', 'Tea sizes', 'Small 16oz', 0, { itemIds: teaSizedIds }]),
  mod(['size-large-22oz', 'size', 'Tea sizes', 'Large 22oz', 0.75, { itemIds: teaSizedIds }]),

  // Sugar ladders from Piseth's preview spec (no price impact)
  ...(['0', '25', '50', '75', '100'] as const).map((level) =>
    mod([`sugar-coffee-${level}`, 'sugar', 'Coffee sugar', `${level}%`, 0, { categoryIds: ['coffee'], source: 'preview-spec' }]),
  ),
  ...(['100', '75', '50', '25'] as const).map((level) =>
    mod([`sugar-tea-${level}`, 'sugar', 'Boba & tea sugar', `${level}%`, 0, { categoryIds: ['matcha', 'boba'], source: 'preview-spec' }]),
  ),

  // Ice levels (preview spec; iced drinks only)
  ...(['Regular ice', 'Less ice', 'Extra ice'] as const).map((name, i) =>
    mod([`ice-${i}`, 'ice', 'Ice level', name, 0, { categoryIds: ['matcha', 'boba'], itemIds: icedCoffeeIds, source: 'preview-spec' }]),
  ),

  // Repo flavor syrups — each takes its own quantity in the order flow
  mod(['flavor-caramel-syrup', 'flavor', 'Flavor syrups', 'Caramel Syrup', 0.79, { itemIds: ['latte', 'iced-latte', 'americano', 'iced-americano', 'cappuccino'] }]),
  mod(['flavor-vanilla-syrup', 'flavor', 'Flavor syrups', 'Vanilla Syrup', 0.79, { itemIds: ['latte', 'iced-latte', 'americano', 'iced-americano', 'cappuccino'] }]),
  mod(['flavor-hazelnut-syrup', 'flavor', 'Flavor syrups', 'Hazelnut Syrup', 0.79, { itemIds: ['latte', 'iced-latte', 'americano', 'iced-americano', 'cappuccino'] }]),
  mod(['flavor-mocha-syrup', 'flavor', 'Flavor syrups', 'Mocha Syrup', 0.79, { itemIds: ['latte', 'iced-latte', 'cappuccino'] }]),
  mod(['flavor-brown-sugar-syrup', 'flavor', 'Flavor syrups', 'Brown Sugar Syrup', 0.79, { itemIds: ['latte', 'iced-latte', 'americano'] }]),

  // Repo toppings — each takes its own quantity
  mod(['addon-boba-pearls', 'addon', 'Toppings', 'Boba Pearls', 0.89, { itemIds: ['taro-milk-tea', 'coconut-milk-tea', 'green-milk-tea', 'lychee-green-tea', 'strawberry-green-tea', 'mango-green-tea'] }]),
  mod(['addon-strawberry-popping', 'addon', 'Toppings', 'Strawberry Popping', 0.89, { itemIds: ['lychee-green-tea', 'strawberry-green-tea', 'mango-green-tea', 'passionfruit-green-tea'] }]),
  mod(['addon-mango-popping', 'addon', 'Toppings', 'Mango Popping', 0.89, { itemIds: ['mango-green-tea', 'mango-lychee-green-tea', 'taro-milk-tea'] }]),
  mod(['addon-lychee-jelly', 'addon', 'Toppings', 'Lychee Jelly', 0.89, { itemIds: ['lychee-green-tea', 'mango-lychee-green-tea', 'rose-green-tea'] }]),
  mod(['addon-vanilla-sweet-foam', 'addon', 'Toppings', 'Vanilla Sweet Foam', 0.89, { itemIds: ['iced-latte', 'iced-matcha-latte', 'iced-pistachio-latte'] }]),

  // Repo milk swaps — each takes its own quantity
  mod(['addon-almond-milk', 'addon', 'Milk swaps', 'Almond Milk', 0.79, { itemIds: ['latte', 'iced-latte', 'cappuccino', 'iced-matcha-latte'] }]),
  mod(['addon-oat-milk', 'addon', 'Milk swaps', 'Oat Milk', 0.79, { itemIds: ['latte', 'iced-latte', 'cappuccino', 'iced-matcha-latte', 'iced-pistachio-latte'] }]),
  mod(['addon-coconut-milk', 'addon', 'Milk swaps', 'Coconut Milk', 0.79, { itemIds: ['latte', 'iced-latte', 'iced-matcha-latte', 'taro-milk-tea'] }]),
];

export function createSeedState(): AppState {
  return {
    version: 1,
    nextOrderNumber: 1,
    items: structuredClone(ITEMS),
    modifiers: structuredClone(MODIFIERS),
    media: {
      heroPhoto: '/images/shop-1.jpg',
      favoritesPhoto: '/images/shop-2.jpg',
      dubaiPhoto: '/images/shop-3.jpg',
      bearArt: '/images/bear-balloon.jpg',
      kolacheArt: '/images/kolache-mural.jpg',
      icedCoffeeArt: '/images/iced-coffee-mural.jpg',
      shopVideo: '',
      instagramSync: true,
    },
    customers: [],
    orders: [],
    applications: [],
  };
}
