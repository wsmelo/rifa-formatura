export const RAFFLE_CONFIG = Object.freeze({
  title: "Rifa da Formatura",
  pixKey: "27 996039705",
  beneficiary: "Organização da Rifa",
  pricePerNumber: 10,
  drawDate: "23/12/2026",
  reservationMinutes: 30,
  minNumber: 0,
  maxNumber: 100,
  maxSelection: 20,
  preSoldNumbers: [7, 13, 18, 27, 43, 49],
  supabaseUrl: import.meta.env.VITE_RIFA_SUPABASE_URL?.trim() || "",
  supabaseAnonKey: import.meta.env.VITE_RIFA_SUPABASE_ANON_KEY?.trim() || "",
});

export function hasConfiguredPixKey() {
  return Boolean(
    RAFFLE_CONFIG.pixKey &&
      RAFFLE_CONFIG.pixKey !== "COLE_SUA_CHAVE_PIX_AQUI",
  );
}
