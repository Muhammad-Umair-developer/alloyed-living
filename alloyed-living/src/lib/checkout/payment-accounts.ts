// Shared, client-safe helpers for the admin-managed bank account details stored
// in the `payment-methods` content row. No server-only imports, so both the
// checkout / confirmation UI (client) and server code can use it.

export interface PaymentMethodsFields {
  ubl?: {
    accountTitle?: string
    bankName?: string
    accountNumber?: string
    iban?: string
  }
  jazzcash?: {
    accountTitle?: string
    number?: string
  }
}

// Returns the display label and detail lines for the account a payment goes to.
export function accountLines(
  account: "ubl" | "jazzcash",
  pm: PaymentMethodsFields | null,
): { label: string; lines: string[] } {
  if (account === "jazzcash") {
    const j = pm?.jazzcash ?? {}
    return {
      label: "JazzCash",
      lines: [j.accountTitle, j.number && `Number: ${j.number}`].filter(Boolean) as string[],
    }
  }
  const u = pm?.ubl ?? {}
  return {
    label: "UBL Bank Transfer",
    lines: [
      u.accountTitle,
      u.bankName,
      u.accountNumber && `Account: ${u.accountNumber}`,
      u.iban && `IBAN: ${u.iban}`,
    ].filter(Boolean) as string[],
  }
}
