import type { SalesOrder } from '../domain/past-looks';

/** An order whose lines carry portions of look discounts, one line per entry. */
export const salesOrder = (
  id: string,
  units: Array<{
    discountId: string;
    quantity: number;
    currency?: string;
    cents?: number;
  }>
): SalesOrder => ({
  id,
  lineItems: units.map((unit) => ({
    discountedPricePerQuantity: [
      {
        quantity: unit.quantity,
        discountedPrice: {
          value: {
            currencyCode: unit.currency ?? 'EUR',
            centAmount: unit.cents ?? 6000,
          },
          includedDiscounts: [{ discount: { id: unit.discountId } }],
        },
      },
    ],
  })),
});
