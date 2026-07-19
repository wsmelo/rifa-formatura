import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTotal,
  formatPhoneInput,
  formatRaffleNumber,
  isValidBrazilianPhone,
  normalizeNumbers,
} from "../number-utils.js";

test("calcula R$ 10 por número selecionado", () => {
  assert.equal(calculateTotal(0, 10), 0);
  assert.equal(calculateTotal(1, 10), 10);
  assert.equal(calculateTotal(2, 10), 20);
  assert.equal(calculateTotal(20, 10), 200);
});

test("exibe números de 0 a 100 com largura consistente", () => {
  assert.equal(formatRaffleNumber(0), "00");
  assert.equal(formatRaffleNumber(7), "07");
  assert.equal(formatRaffleNumber(42), "42");
  assert.equal(formatRaffleNumber(100), "100");
});

test("remove duplicados e valores fora da rifa", () => {
  assert.deepEqual(normalizeNumbers([4, 2, 4, 101, -1, "8"]), [2, 4, 8]);
});

test("valida e formata WhatsApp brasileiro", () => {
  assert.equal(formatPhoneInput("11987654321"), "(11) 98765-4321");
  assert.equal(isValidBrazilianPhone("(11) 98765-4321"), true);
  assert.equal(isValidBrazilianPhone("1234"), false);
});
