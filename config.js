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
  supabaseUrl: " https://kcptfvgvpoghgdkcoyka.supabase.co/rest/v1/ ",
  supabaseAnonKey: " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjcHRmdmd2cG9naGdka2NveWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MDQxNjcsImV4cCI6MjEwMzE4MDE2N30.-iF4Byi9YdmWGGDoaCC0zEqy8FJLXNqMX-9PaBzyTTk ",
});

export function hasConfiguredPixKey() {
  return Boolean(
    RAFFLE_CONFIG.pixKey &&
      RAFFLE_CONFIG.pixKey !== "COLE_SUA_CHAVE_PIX_AQUI",
  );
}
