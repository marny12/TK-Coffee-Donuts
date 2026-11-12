/**
 * Website menu → TK POS menu mapping.
 *
 * The website and the POS keep their own menu records. The POS book
 * (Shift4 chart prices, in ~/workspace/tk-pos-standalone) is the source
 * of truth at order time: the POS intake re-prices everything from its
 * own book, so this map only has to answer "which POS item / modifier
 * is this website item / modifier?". Matching is by exact POS name.
 *
 * Items or priced modifiers with NO entry here are not sold online —
 * the translator refuses them with a plain "call the shop" message
 * instead of guessing. Known gaps, on purpose:
 * - 'fancy-donut' (the website's generic fancy-case pick) has no single
 *   POS counterpart.
 * - 'addon-lychee-jelly' has no POS modifier (the POS carries Lychee
 *   Popping and Strawberry Jelly, neither of which is lychee jelly).
 * - 'addon-vanilla-sweet-foam' maps to the POS's "Vanilla Sweet Foam
 *   Cream" — same product family; the POS price ($1.25) wins over the
 *   website's displayed $0.89, like every other price difference.
 *
 * Sizes, sugar levels and ice levels are preparation instructions, not
 * POS-priced modifiers: they travel as line notes and print on the
 * kitchen ticket (see pos-intake.ts). The website's size price adders
 * are NOT re-created at the POS in this phase — the POS prices its base
 * items as the standard size, and the confirmation shows the POS total.
 */
export const POS_ITEM_BY_SITE_ID: Record<string, string> = {
  // Handmade Donuts — Regular
  glazed: 'Glazed Donut',
  'sugar-donut': 'Sugar Donut',
  'chocolate-frosted': 'Chocolate Frosted Donut',
  filled: 'Filled Donut',
  'sprinkle-donut': 'Sprinkle Donut',
  // Fancy & Dossants (donut-holes is sold by the dozen on the website)
  'cinnamon-roll': 'Cinnamon Roll',
  'apple-fritter': 'Apple Fritter',
  dossant: 'Dossant',
  'donut-holes': 'Donut Holes (Dozen)',
  'dubai-donut': 'Dubai Donut',
  // Morning Coffee — hot
  americano: 'Americano',
  latte: 'Latte',
  cappuccino: 'Cappuccino',
  espresso: 'Espresso',
  'hot-cocoa-marshmello': 'Hot Cocoa Marshmello',
  // Morning Coffee — iced
  'iced-americano': 'Iced Americano',
  'iced-latte': 'Iced Latte',
  'iced-matcha-latte': 'Iced Matcha Latte',
  'tk-signature-iced-coffee': 'TK Signature Iced Coffee',
  'iced-rose-latte': 'Iced Rose Latte',
  'iced-pistachio-latte': 'Iced Pistachio Latte',
  // Refreshment Teas
  'lychee-green-tea': 'Lychee Green Tea',
  'strawberry-green-tea': 'Strawberry Green Tea',
  'passionfruit-green-tea': 'Passionfruit Green Tea',
  'mango-green-tea': 'Mango Green Tea',
  'peach-green-tea': 'Peach Green Tea',
  'rose-green-tea': 'Rose Green Tea',
  'mango-lychee-green-tea': 'Mango Lychee Green Tea',
  // Boba & Milk Tea
  'green-milk-tea': 'Green Milk Tea',
  'black-sugar-boba-fresh-milk': 'Black Sugar Boba / Fresh Milk',
  'taro-milk-tea': 'Taro Milk Tea',
  'coconut-milk-tea': 'Coconut Milk Tea',
  // Morning Rolls — kolache
  'regular-smoked-cheese': 'Regular Smoked Cheese Kolache',
  'jalapeno-smoked-cheese': 'Jalapeño Smoked Cheese Kolache',
  'beef-smoked-no-cheese': 'Beef Smoked (No Cheese) Kolache',
  // Morning Rolls — croissant rolls
  'bacon-sausage-roll': 'Bacon Sausage Roll',
  'chicken-cheese-roll': 'Chicken Cheese Roll',
  'ham-swiss-cheese-roll': 'Ham & Swiss Cheese Roll',
};

/** Dozen variant → the POS's own dozen items (website dozen prices match). */
export const POS_DOZEN_BY_SITE_ID: Record<string, string> = {
  glazed: 'Dozen Glazed',
  'sugar-donut': 'Dozen Sugar',
  'chocolate-frosted': 'Dozen Chocolate Frosted',
  filled: 'Dozen Filled',
  'sprinkle-donut': 'Dozen Sprinkle',
  'cinnamon-roll': 'Dozen Cinnamon Roll',
  'apple-fritter': 'Dozen Apple Fritter',
  dossant: 'Dozen Dossant',
};

/** Priced website modifiers (flavors + add-ons) → POS modifier names. */
export const POS_MOD_BY_SITE_ID: Record<string, string> = {
  'flavor-caramel-syrup': 'Caramel',
  'flavor-vanilla-syrup': 'Vanilla',
  'flavor-hazelnut-syrup': 'Hazelnut',
  'flavor-mocha-syrup': 'Mocha',
  'flavor-brown-sugar-syrup': 'Brown Sugar',
  'addon-boba-pearls': 'Boba (Tapioca Pearls)',
  'addon-strawberry-popping': 'Strawberry Popping',
  'addon-mango-popping': 'Mango Popping',
  'addon-vanilla-sweet-foam': 'Vanilla Sweet Foam Cream',
  'addon-almond-milk': 'Almond Milk',
  'addon-oat-milk': 'Oat Milk',
  'addon-coconut-milk': 'Coconut Milk',
};
