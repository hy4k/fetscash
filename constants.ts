export const CATEGORY_REPLENISHMENT = 'Replenishment';

export const PARTNERS = ['Mithun', 'Niyas', 'Company'] as const;
export type PartnerType = (typeof PARTNERS)[number];

export const LOCATIONS = ['Cochin', 'Calicut'] as const;
export type LocationType = (typeof LOCATIONS)[number];

export const RECURRING_CATEGORIES = ['Rent', 'Electricity'] as const;

export const EXPENSE_CATEGORIES = [
  'Travel',
  'Food',
  'Stationery',
  'Maintenance',
  'Marketing',
  'Rent',
  'Electricity',
  'Miscellaneous',
] as const;
