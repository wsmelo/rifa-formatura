import { hasConfiguredPixKey, RAFFLE_CONFIG } from "./config.js";
import {
  calculateTotal,
  formatCurrency,
  formatPhoneInput,
  formatRaffleNumber,
  isValidBrazilianPhone,
} from "./number-utils.js";
import { reservationService } from "./reservation-service.js";

const elements = {
  grid: document.querySelector("#number-grid"),
  picker: document.querySelector(".number-picker"),
  availableCount: document.querySelector("#available-count"),
  reservedCount: document.querySelector("#reserved-count"),
  clearSelection: document.querySelector("#clear-selection"),
  selectedCount: document.querySelector("#selected-count"),
  chosenNumbers: document.querySelector("#chosen-numbers"),
  checkoutTotal: document.querySelector("#checkout-total"),
  checkoutForm: document.querySelector("#checkout-form"),
  buyerName: document.querySelector("#buyer-name"),
  buyerPhone: document.querySelector("#buyer-phone"),
  nameError: document.querySelector("#name-error"),
  phoneError: document.querySelector("#phone-error"),
  payButton: document.querySelector("#pay-button"),
  pickerError: document.querySelector("#picker-error"),
  demoNotice: document.querySelector("#demo-notice"),
  mobileSelection: document.querySelector("#mobile-selection"),
  mobileCount: document.querySelector("#mobile-count"),
  mobileTotal: document.querySelector("#mobile-total"),
  mobileContinue: document.querySelector("#mobile-continue"),
  dialog: document.querySelector("#payment-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  modalTotal: document.querySelector("#modal-total"),
  modalPixKey: document.querySelector("#modal-pix-key"),
  modalNumbers: document.querySelector("#modal-numbers"),
  pixPending: document.querySelector("#pix-pending"),
  copyPix: document.querySelector("#copy-pix"),
  copySummary: document.querySelector("#copy-summary"),
  countdown: document.querySelector("#countdown"),
  confirmPayment: document.querySelector("#confirm-payment"),
  paymentSuccess: document.querySelector("#payment-success"),
  toast: document.querySelector("#toast"),
};

const state = {
  catalog: [],
  selected: new Set(),
  reservation: null,
  loading: false,
  countdownTimer: null,
};

function getSelectedNumbers() {
  return [...state.selected].sort((first, second) => first - second);
}

function getTotal() {
  return calculateTotal(state.selected.size, RAFFLE_CONFIG.pricePerNumber);
}

function numberStatus(number) {
  return state.catalog.find((entry) => entry.number === number)?.status || "available";
}

function isUnavailable(status) {
  return ["reserved", "payment_reported", "paid"].includes(status);
}

function renderGrid() {
  const fragment = document.createDocumentFragment();
  for (let number = RAFFLE_CONFIG.minNumber; number <= RAFFLE_CONFIG.maxNumber; number += 1) {
    const status = numberStatus(number);
    const selected = state.selected.has(number);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `number-cell${selected ? " is-selected" : ""}${isUnavailable(status) ? " is-reserved" : ""}`;
    button.dataset.number = String(number);
    button.textContent = formatRaffleNumber(number);
    button.disabled = isUnavailable(status);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute(
      "aria-label",
      isUnavailable(status)
        ? `Número ${formatRaffleNumber(number)} reservado`
        : `Número ${formatRaffleNumber(number)}${selected ? ", selecionado" : ", disponível"}`,
    );
    fragment.append(button);
  }
  elements.grid.replaceChildren(fragment);
  elements.picker.setAttribute("aria-busy", "false");
}

function renderAvailability() {
  const reserved = state.catalog.filter((entry) => isUnavailable(entry.status)).length;
  elements.availableCount.textContent = String(state.catalog.length - reserved);
  elements.reservedCount.textContent = String(reserved);
}

function renderSelection() {
  const numbers = getSelectedNumbers();
  const total = getTotal();
  elements.selectedCount.textContent = String(numbers.length);
  elements.checkoutTotal.textContent = formatCurrency(total);
  elements.clearSelection.disabled = numbers.length === 0;
  elements.payButton.disabled = numbers.length === 0 || state.loading;
  elements.mobileCount.textContent = `${numbers.length} ${numbers.length === 1 ? "número" : "números"}`;
  elements.mobileTotal.textContent = formatCurrency(total);
  elements.mobileSelection.hidden = numbers.length === 0;

  if (!numbers.length) {
    elements.chosenNumbers.innerHTML = '<span class="empty-choice">Seus números aparecerão aqui</span>';
  } else {
    elements.chosenNumbers.replaceChildren(
      ...numbers.map((number) => {
        const span = document.createElement("span");
        span.textContent = formatRaffleNumber(number);
        return span;
      }),
    );
  }
  renderGrid();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }
  showToast(successMessage);
}

async function loadAvailability({ quiet = false } = {}) {
  if (!quiet) {
    elements.picker.setAttribute("aria-busy", "true");
    elements.pickerError.textContent = "";
  }
  try {
    state.catalog = await reservationService.listNumbers();
    for (const number of state.selected) {
      if (isUnavailable(numberStatus(number))) state.selected.delete(number);
    }
    renderAvailability();
    renderSelection();
  } catch (error) {
    elements.picker.setAttribute("aria-busy", "false");
    elements.pickerError.textContent = error.message;
  }
}

function toggleNumber(number) {
  elements.pickerError.textContent = "";
  if (state.selected.has(number)) {
    state.selected.delete(number);
  } else if (state.selected.size >= RAFFLE_CONFIG.maxSelection) {
    elements.pickerError.textContent = `Você pode selecionar até ${RAFFLE_CONFIG.maxSelection} números por vez.`;
  } else {
    state.selected.add(number);
  }
  renderSelection();
}

function validateForm() {
  const name = elements.buyerName.value.trim();
  const phone = elements.buyerPhone.value.trim();
  let valid = true;
  elements.nameError.textContent = "";
  elements.phoneError.textContent = "";
  elements.buyerName.removeAttribute("aria-invalid");
  elements.buyerPhone.removeAttribute("aria-invalid");

  if (name.length < 3) {
    elements.nameError.textContent = "Informe seu nome completo.";
    elements.buyerName.setAttribute("aria-invalid", "true");
    valid = false;
  }
  if (!isValidBrazilianPhone(phone)) {
    elements.phoneError.textContent = "Informe um WhatsApp com DDD.";
    elements.buyerPhone.setAttribute("aria-invalid", "true");
    valid = false;
  }
  if (!state.selected.size) {
    elements.pickerError.textContent = "Escolha pelo menos um número.";
    valid = false;
  }
  return valid ? { name, phone } : null;
}

function updateCountdown() {
  if (!state.reservation?.expiresAt) return;
  const remaining = new Date(state.reservation.expiresAt).getTime() - Date.now();
  if (remaining <= 0) {
    elements.countdown.textContent = "expirada";
    elements.confirmPayment.disabled = true;
    window.clearInterval(state.countdownTimer);
    return;
  }
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  elements.countdown.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function openPaymentDialog(reservation, buyer) {
  const total = calculateTotal(reservation.numbers.length, RAFFLE_CONFIG.pricePerNumber);
  state.reservation = { ...reservation, buyer, total };
  elements.modalTotal.textContent = formatCurrency(total);
  elements.modalPixKey.textContent = RAFFLE_CONFIG.pixKey;
  elements.modalNumbers.textContent = reservation.numbers.map(formatRaffleNumber).join(", ");
  elements.pixPending.hidden = hasConfiguredPixKey();
  elements.copyPix.disabled = !hasConfiguredPixKey();
  elements.confirmPayment.disabled = false;
  elements.confirmPayment.hidden = false;
  elements.paymentSuccess.hidden = true;
  window.clearInterval(state.countdownTimer);
  updateCountdown();
  state.countdownTimer = window.setInterval(updateCountdown, 1000);
  elements.dialog.showModal();
}

async function handleCheckout(event) {
  event.preventDefault();
  const buyer = validateForm();
  if (!buyer || state.loading) return;
  const numbers = getSelectedNumbers();
  state.loading = true;
  elements.payButton.disabled = true;
  elements.payButton.classList.add("is-loading");
  elements.payButton.querySelector("span").textContent = "Reservando...";
  try {
    const reservation = await reservationService.reserveNumbers(numbers, buyer);
    state.selected.clear();
    await loadAvailability({ quiet: true });
    openPaymentDialog(reservation, buyer);
  } catch (error) {
    elements.pickerError.textContent = error.message;
    await loadAvailability({ quiet: true });
  } finally {
    state.loading = false;
    elements.payButton.classList.remove("is-loading");
    elements.payButton.querySelector("span").textContent = "Pagar com Pix";
    elements.payButton.disabled = state.selected.size === 0;
  }
}

async function handlePaymentReport() {
  if (!state.reservation || elements.confirmPayment.disabled) return;
  elements.confirmPayment.disabled = true;
  elements.confirmPayment.textContent = "Enviando...";
  try {
    await reservationService.reportPayment(state.reservation.reservationId);
    elements.confirmPayment.hidden = true;
    elements.paymentSuccess.hidden = false;
    window.clearInterval(state.countdownTimer);
    await loadAvailability({ quiet: true });
  } catch (error) {
    showToast(error.message);
    elements.confirmPayment.disabled = false;
  } finally {
    elements.confirmPayment.textContent = "Já fiz o Pix";
  }
}

elements.grid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-number]");
  if (button && !button.disabled) toggleNumber(Number(button.dataset.number));
});
elements.clearSelection.addEventListener("click", () => {
  state.selected.clear();
  renderSelection();
});
elements.checkoutForm.addEventListener("submit", handleCheckout);
elements.buyerPhone.addEventListener("input", (event) => {
  event.target.value = formatPhoneInput(event.target.value);
});
elements.mobileContinue.addEventListener("click", () => {
  document.querySelector(".checkout-card").scrollIntoView({ behavior: "smooth" });
  window.setTimeout(() => elements.buyerName.focus(), 500);
});
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.copyPix.addEventListener("click", () => copyText(RAFFLE_CONFIG.pixKey, "Chave Pix copiada!"));
elements.copySummary.addEventListener("click", () => {
  if (!state.reservation) return;
  const numbers = state.reservation.numbers.map(formatRaffleNumber).join(", ");
  copyText(
    `Rifa da Formatura — números: ${numbers} — valor: ${formatCurrency(state.reservation.total)}`,
    "Resumo copiado!",
  );
});
elements.confirmPayment.addEventListener("click", handlePaymentReport);

if (reservationService.mode === "local") elements.demoNotice.hidden = false;
reservationService.subscribe(() => loadAvailability({ quiet: true }));
window.setInterval(() => loadAvailability({ quiet: true }), 15_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadAvailability({ quiet: true });
});
loadAvailability();
