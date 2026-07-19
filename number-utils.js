export function calculateTotal(quantity, pricePerNumber = 10) {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
  return safeQuantity * pricePerNumber;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatRaffleNumber(number) {
  return number === 100 ? "100" : String(number).padStart(2, "0");
}

export function normalizeNumbers(numbers, minNumber = 0, maxNumber = 100) {
  return [...new Set(numbers.map(Number))]
    .filter(
      (number) =>
        Number.isInteger(number) &&
        number >= minNumber &&
        number <= maxNumber,
    )
    .sort((first, second) => first - second);
}

export function isValidBrazilianPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export function formatPhoneInput(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
