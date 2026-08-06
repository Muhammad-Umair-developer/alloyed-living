// Shared, client-safe checkout constants. No server-only imports, so this is
// safe to import from both server modules (order pricing) and client components
// (the checkout UI) without pulling server code into the browser bundle.

// The Cash-on-Delivery deposit, in whole rupees. Orders at or below this amount
// are paid in full (deposit = total, nothing due on delivery).
export const COD_NOMINAL_DEPOSIT = 500
