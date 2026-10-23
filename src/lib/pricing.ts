import type { CartSelection, MenuItem, ModifierOption } from '@/lib/types';

export const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export function optionApplies(option: ModifierOption, item: MenuItem): boolean {
  if (!option.enabled) return false;
  if (option.itemIds?.includes(item.id)) return true;
  if (option.categoryIds?.includes(item.categoryId)) return true;
  return false;
}

export function optionsFor(item: MenuItem, modifiers: ModifierOption[], group: ModifierOption['group']): ModifierOption[] {
  return modifiers.filter((option) => option.group === group && optionApplies(option, item));
}

export function defaultSelections(item: MenuItem, modifiers: ModifierOption[]): CartSelection {
  const size = optionsFor(item, modifiers, 'size')[0];
  const sugars = optionsFor(item, modifiers, 'sugar');
  const sugar = sugars.find((option) => option.name === '100%') ?? sugars[0];
  const ice = item.isIced ? optionsFor(item, modifiers, 'ice').find((option) => option.name === 'Regular ice') ?? optionsFor(item, modifiers, 'ice')[0] : undefined;
  return {
    sizeId: size?.id,
    sugarId: item.isDrink ? sugar?.id : undefined,
    iceId: ice?.id,
    flavors: {},
    addons: {},
  };
}

function pricedQuantityTotal(record: Record<string, number>, item: MenuItem, modifiers: ModifierOption[]): number {
  let total = 0;
  for (const [id, rawQty] of Object.entries(record)) {
    const option = modifiers.find((candidate) => candidate.id === id);
    if (!option || !optionApplies(option, item)) continue;
    const qty = Math.max(0, Math.min(10, Math.floor(rawQty) || 0));
    total += option.priceCents * qty;
  }
  return total;
}

export function unitPriceCents(
  item: MenuItem,
  variant: 'single' | 'dozen',
  selections: CartSelection,
  modifiers: ModifierOption[],
): number {
  let total = variant === 'dozen' && item.dozenPriceCents ? item.dozenPriceCents : item.priceCents;
  if (variant === 'single' && selections.sizeId) {
    const size = modifiers.find((option) => option.id === selections.sizeId);
    if (size && optionApplies(size, item)) total += size.priceCents;
  }
  total += pricedQuantityTotal(selections.flavors, item, modifiers);
  total += pricedQuantityTotal(selections.addons, item, modifiers);
  return total;
}

export function selectionLabels(item: MenuItem, selections: CartSelection, modifiers: ModifierOption[]): string[] {
  const labels: string[] = [];
  const pushSingle = (id: string | undefined, prefix = '') => {
    const option = modifiers.find((candidate) => candidate.id === id);
    if (option && optionApplies(option, item)) labels.push(`${prefix}${option.name}`);
  };
  pushSingle(selections.sizeId);
  if (selections.sugarId) pushSingle(selections.sugarId, 'Sugar ');
  pushSingle(selections.iceId);
  const pushQuantities = (record: Record<string, number>) => {
    for (const [id, qty] of Object.entries(record)) {
      if (!qty) continue;
      const option = modifiers.find((candidate) => candidate.id === id);
      if (option && optionApplies(option, item)) labels.push(`${option.name} ×${qty}`);
    }
  };
  pushQuantities(selections.flavors);
  pushQuantities(selections.addons);
  return labels;
}

export function lineKey(itemId: string, variant: 'single' | 'dozen', selections: CartSelection): string {
  return [itemId, variant, selections.sizeId ?? '', selections.sugarId ?? '', selections.iceId ?? '', JSON.stringify(selections.flavors), JSON.stringify(selections.addons)].join('|');
}
