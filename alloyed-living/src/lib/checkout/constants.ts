// Shared, client-safe checkout constants. No server-only imports, so this is
// safe to import from both server modules (order pricing) and client components
// (the checkout UI) without pulling server code into the browser bundle.

// The Cash-on-Delivery deposit, in whole rupees. Orders at or below this amount
// are paid in full (deposit = total, nothing due on delivery).
export const COD_NOMINAL_DEPOSIT = 500

// COD downpayment tiers. Below Rs 10,000, unchanged from the old flat-deposit
// behavior: pay in full if the order is smaller than the nominal deposit,
// otherwise pay the nominal deposit. From Rs 10,000 up, the deposit scales
// with order size instead of staying flat at COD_NOMINAL_DEPOSIT.
//
// Pure/client-safe on purpose: the checkout page needs this to render the
// deposit figure before the order is placed. This is display-only — the
// server independently recomputes it from its own priced total in
// computeAwaitingAmounts (src/lib/data/orders.ts), so a tampered client call
// here can't change what actually gets charged/stored.
export function calculateDownpayment(orderTotal: number): number {
  if (orderTotal < 10_000) return Math.min(COD_NOMINAL_DEPOSIT, orderTotal)
  if (orderTotal <= 25_000) return 1_000
  if (orderTotal <= 60_000) return orderTotal * 0.1
  return Math.min(orderTotal * 0.15, 15_000)
}
