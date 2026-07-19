export const ADMIN_STATUS = Object.freeze({
  available: { label: "Disponível", tone: "available" },
  reserved: { label: "Aguardando Pix", tone: "reserved" },
  payment_reported: { label: "Pix informado", tone: "reported" },
  paid: { label: "Pago / vendido", tone: "paid" },
});

export function getAdminStatus(status) {
  return ADMIN_STATUS[status] || { label: "Desconhecido", tone: "neutral" };
}

export function formatAdminNumber(number) {
  return Number(number) === 100 ? "100" : String(number).padStart(2, "0");
}

export function formatAdminPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone || "Não informado";
}

export function formatAdminDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function calculateAdminStats(rows) {
  const stats = {
    total: rows.length,
    available: 0,
    reserved: 0,
    payment_reported: 0,
    paid: 0,
  };
  for (const row of rows) {
    if (Object.hasOwn(stats, row.status)) stats[row.status] += 1;
  }
  return stats;
}

export function filterAdminRows(rows, { query = "", status = "all" } = {}) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase("pt-BR");
  const queryDigits = normalizedQuery.replace(/\D/g, "");

  return rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (!normalizedQuery) return true;

    const number = String(row.number);
    const formattedNumber = formatAdminNumber(row.number);
    const buyerName = String(row.buyer_name || "").toLocaleLowerCase("pt-BR");
    const buyerPhone = String(row.buyer_phone || "").replace(/\D/g, "");

    return (
      number === normalizedQuery ||
      formattedNumber === normalizedQuery ||
      buyerName.includes(normalizedQuery) ||
      (queryDigits && buyerPhone.includes(queryDigits))
    );
  });
}

export function isAdminPasswordSetupHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return ["invite", "recovery"].includes(params.get("type"));
}

export function isAdminRouteHash(hash) {
  return String(hash || "") === "#admin" || isAdminPasswordSetupHash(hash);
}

export function validateAdminPassword(password, confirmation) {
  if (String(password).length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (password !== confirmation) {
    return "As senhas digitadas precisam ser iguais.";
  }
  return "";
}
