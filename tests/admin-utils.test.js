import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAdminStats,
  filterAdminRows,
  formatAdminNumber,
  formatAdminPhone,
  getAdminStatus,
} from "../admin-utils.js";

const rows = [
  { number: 7, status: "paid", buyer_name: "Mara Silva", buyer_phone: "27996039705" },
  { number: 22, status: "payment_reported", buyer_name: "Ana Souza", buyer_phone: "27999998888" },
  { number: 40, status: "available", buyer_name: null, buyer_phone: null },
];

test("resume os estados dos números", () => {
  assert.deepEqual(calculateAdminStats(rows), {
    total: 3,
    available: 1,
    reserved: 0,
    payment_reported: 1,
    paid: 1,
  });
});

test("filtra por nome, telefone, número e status", () => {
  assert.deepEqual(filterAdminRows(rows, { query: "mara" }).map((row) => row.number), [7]);
  assert.deepEqual(filterAdminRows(rows, { query: "9603" }).map((row) => row.number), [7]);
  assert.deepEqual(filterAdminRows(rows, { query: "22" }).map((row) => row.number), [22]);
  assert.deepEqual(filterAdminRows(rows, { status: "available" }).map((row) => row.number), [40]);
});

test("formata número, telefone e rótulo de status", () => {
  assert.equal(formatAdminNumber(7), "07");
  assert.equal(formatAdminNumber(100), "100");
  assert.equal(formatAdminPhone("27996039705"), "(27) 99603-9705");
  assert.equal(getAdminStatus("payment_reported").label, "Pix informado");
});
