export type CategoryId = 'matcha' | 'coffee' | 'boba' | 'donuts' | 'fancy' | 'rolls';
export type ModifierGroup = 'size' | 'sugar' | 'ice' | 'flavor' | 'addon';

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  accent: 'matcha' | 'sun' | 'blue' | 'pink' | 'cherry' | 'brown';
}

export interface MenuItem {
  id: string;
  categoryId: CategoryId;
  subgroup: string;
  name: string;
  priceCents: number;
  priceLabel?: string;
  dozenPriceCents?: number;
  description: string;
  tags: string[];
  isDrink: boolean;
  isIced: boolean;
  source: 'repo-index.html' | 'pending-confirmation';
  pendingConfirmation?: boolean;
}

export interface ModifierOption {
  id: string;
  group: ModifierGroup;
  subgroup: string;
  name: string;
  priceCents: number;
  enabled: boolean;
  itemIds?: string[];
  categoryIds?: CategoryId[];
  source: 'repo-index.html' | 'preview-spec';
}

export interface MediaState {
  heroPhoto: string;
  favoritesPhoto: string;
  dubaiPhoto: string;
  bearArt: string;
  kolacheArt: string;
  icedCoffeeArt: string;
  matchaArt: string;
  neonSignPhoto: string;
  shopVideo: string;
  instagramSync: boolean;
}

export interface CartSelection {
  sizeId?: string;
  sugarId?: string;
  iceId?: string;
  flavors: Record<string, number>;
  addons: Record<string, number>;
}

export interface OrderLine {
  key: string;
  itemId: string;
  name: string;
  categoryId: CategoryId;
  categoryName: string;
  variant: 'single' | 'dozen';
  quantity: number;
  unitPriceCents: number;
  selections: CartSelection;
  selectionLabels: string[];
}

export interface Order {
  id: string;
  number: number;
  createdAt: string;
  customerType: 'guest' | 'account';
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  lines: OrderLine[];
  totalCents: number;
  status: 'New';
  /** TK POS order id once the order has been forwarded to the shop POS. */
  posOrderId?: string;
  /** Square payment id when the customer paid online. */
  posPaymentRef?: string;
  /** True when the order was paid online through Square. */
  paidOnline?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Application {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  availability: string;
  message: string;
}

export interface AppState {
  version: number;
  nextOrderNumber: number;
  items: MenuItem[];
  modifiers: ModifierOption[];
  media: MediaState;
  customers: Customer[];
  orders: Order[];
  applications: Application[];
}

export interface PublicSession {
  hasAccess: boolean;
  admin: boolean;
  customer?: { id: string; name: string; phone: string; email: string };
}

export interface BootstrapState {
  items: MenuItem[];
  modifiers: ModifierOption[];
  media: MediaState;
  session: PublicSession;
  myOrders: Order[];
  /** Card pay (Square) is exposed only when fully configured server-side. */
  payments: {
    squarePayEnabled: boolean;
    squareApplicationId?: string;
    squareLocationId?: string;
    squareSdkUrl?: string;
  };
  adminData?: { orders: Order[]; applications: Application[] };
}
