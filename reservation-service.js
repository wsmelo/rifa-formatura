import { createClient } from "@supabase/supabase-js";
import { RAFFLE_CONFIG } from "./config.js";
import { normalizeNumbers } from "./number-utils.js";

const STORAGE_KEY = "rifa-formatura-reservas-v1";
const hasSupabaseConfig = Boolean(
  RAFFLE_CONFIG.supabaseUrl && RAFFLE_CONFIG.supabaseAnonKey,
);

const supabase = hasSupabaseConfig
  ? createClient(RAFFLE_CONFIG.supabaseUrl, RAFFLE_CONFIG.supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

function createEmptyCatalog() {
  const preSold = new Set(RAFFLE_CONFIG.preSoldNumbers);
  return Array.from(
    { length: RAFFLE_CONFIG.maxNumber - RAFFLE_CONFIG.minNumber + 1 },
    (_, index) => ({
      number: index + RAFFLE_CONFIG.minNumber,
      status: preSold.has(index + RAFFLE_CONFIG.minNumber) ? "paid" : "available",
      expires_at: null,
    }),
  );
}

function readLocalReservations() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const now = Date.now();
    const active = Array.isArray(stored)
      ? stored.filter(
          (item) =>
            item.status === "payment_reported" ||
            (item.expiresAt && new Date(item.expiresAt).getTime() > now),
        )
      : [];

    if (active.length !== stored.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    }
    return active;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeLocalReservations(reservations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  window.dispatchEvent(new Event("rifa:reservations-changed"));
}

function localCatalog() {
  const byNumber = new Map(
    readLocalReservations().map((reservation) => [reservation.number, reservation]),
  );
  return createEmptyCatalog().map((entry) => {
    const reservation = byNumber.get(entry.number);
    return reservation
      ? {
          number: entry.number,
          status: reservation.status,
          expires_at: reservation.expiresAt,
        }
      : entry;
  });
}

function readableDatabaseError(error) {
  const message = error?.message || "Não foi possível acessar as reservas.";
  if (message.includes("already reserved")) {
    return "Um dos números acabou de ser reservado por outra pessoa. Escolha outro número.";
  }
  if (message.includes("Could not find the function")) {
    return "O banco da rifa ainda não foi preparado. Execute o arquivo supabase-setup.sql.";
  }
  return message;
}

export const reservationService = {
  mode: hasSupabaseConfig ? "shared" : "local",

  async listNumbers() {
    if (!supabase) return localCatalog();
    const { data, error } = await supabase.rpc("get_formatura_raffle_numbers");
    if (error) throw new Error(readableDatabaseError(error));
    return data;
  },

  async reserveNumbers(numbers, buyer) {
    const normalized = normalizeNumbers(
      numbers,
      RAFFLE_CONFIG.minNumber,
      RAFFLE_CONFIG.maxNumber,
    );

    if (!normalized.length) throw new Error("Escolha pelo menos um número.");
    if (normalized.length > RAFFLE_CONFIG.maxSelection) {
      throw new Error(`Escolha no máximo ${RAFFLE_CONFIG.maxSelection} números por vez.`);
    }

    if (supabase) {
      const { data, error } = await supabase.rpc("reserve_formatura_raffle_numbers", {
        p_numbers: normalized,
        p_buyer_name: buyer.name,
        p_buyer_phone: buyer.phone,
      });
      if (error) throw new Error(readableDatabaseError(error));
      const reservation = data?.[0];
      return {
        reservationId: reservation.reservation_id,
        expiresAt: reservation.expires_at,
        numbers: reservation.numbers,
      };
    }

    const reservations = readLocalReservations();
    const unavailable = new Set([
      ...RAFFLE_CONFIG.preSoldNumbers,
      ...reservations.map((item) => item.number),
    ]);
    if (normalized.some((number) => unavailable.has(number))) {
      throw new Error("Um dos números acabou de ser reservado. Atualize a página e escolha outro.");
    }

    const reservationId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + RAFFLE_CONFIG.reservationMinutes * 60_000,
    ).toISOString();
    const additions = normalized.map((number) => ({
      number,
      status: "reserved",
      reservationId,
      expiresAt,
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
    }));
    writeLocalReservations([...reservations, ...additions]);
    return { reservationId, expiresAt, numbers: normalized };
  },

  async reportPayment(reservationId) {
    if (supabase) {
      const { data, error } = await supabase.rpc("report_formatura_raffle_payment", {
        p_reservation_id: reservationId,
      });
      if (error) throw new Error(readableDatabaseError(error));
      return data?.[0] || null;
    }

    const reservations = readLocalReservations();
    let found = false;
    const updated = reservations.map((item) => {
      if (item.reservationId !== reservationId) return item;
      found = true;
      return { ...item, status: "payment_reported", expiresAt: null };
    });
    if (!found) throw new Error("Esta reserva expirou. Escolha os números novamente.");
    writeLocalReservations(updated);
    return { reservation_id: reservationId };
  },

  subscribe(callback) {
    const handler = (event) => {
      if (!event.key || event.key === STORAGE_KEY) callback();
    };
    const customHandler = () => callback();
    window.addEventListener("storage", handler);
    window.addEventListener("rifa:reservations-changed", customHandler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("rifa:reservations-changed", customHandler);
    };
  },
};
