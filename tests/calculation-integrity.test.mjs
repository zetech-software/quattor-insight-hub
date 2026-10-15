import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { calculateDensity20, calculateDiesel, avaliarQualidade, estimateLoadingTemperature } from "../supabase/functions/_shared/dieselCalculations.ts";
import { buildCalculationRecord, CalculationInputError } from "../supabase/functions/_shared/calculationRecord.ts";

const golden = JSON.parse(fs.readFileSync(new URL("../src/test/fixtures/golden-cases.json", import.meta.url), "utf8"));
const base = { data: "2026-10-15", numeroNF: "NF", placaCT: "ABC1234", ...golden[0].inputs };
const fields = { B10: ["dnf20",8], B16:["dac20",7], B17:["qualidadeDiff",7], B28:["fcct",7], B29:["v20",3], F15:["volumeRecebido",6] };
for (const c of golden) {
  test("spreadsheet reference: " + c.name, () => {
    const result = calculateDiesel({ ...base, ...c.inputs });
    assert.ok(result);
    for (const [cell, [field, digits]] of Object.entries(fields)) {
      if (typeof c.expected[cell] === "number") assert.ok(Math.abs(result[field] - c.expected[cell]) < 0.5 * 10 ** -digits, cell);
    }
  });
}
test("server owns identity and ignores all supplied derived results", () => {
  const record = buildCalculationRecord({ user_id:"other", inputs:{...base, user_id:"other", dac20:-999, volume_atestado:999999}, results:{dac20:-999} }, "caller");
  assert.equal(record.user_id, "caller");
  assert.equal(record.dac20, calculateDiesel(base).dac20);
  assert.equal(record.volume_atestado, base.volumeNF + base.situacaoSeta);
});
for (const patch of [
  { temperaturaAmostra:undefined }, { temperaturaCT:"" }, { temperaturaCT:Infinity },
  { situacaoSeta:NaN }, { situacaoSeta:-2 * base.volumeNF },
  { volumeNF:0 }, { volumeNF:60001 }, { pesoLiquido:-1 }, { densidadeAmostra:-1 },
  { data:"2026-02-30" }, { numeroNF:"x".repeat(101) },
]) {
  test("reject invalid input: " + Object.keys(patch)[0] + "=" + String(Object.values(patch)[0]), () => {
    assert.throws(() => buildCalculationRecord({inputs:{...base,...patch}}, "caller"), CalculationInputError);
  });
}
test("nominal quality boundary absorbs machine noise only", () => {
  assert.equal(avaliarQualidade(0.835 - 0.832), "aprovado");
  assert.equal(avaliarQualidade(0.832 - 0.835), "aprovado");
  assert.equal(avaliarQualidade(0.003000001), "reprovado");
  assert.equal(avaliarQualidade(-0.003000001), "reprovado");
});
test("density bands are contiguous and invalid domains are rejected", () => {
  assert.notEqual(calculateDensity20(0.82595,25), null);
  assert.equal(calculateDensity20(-1,25), null);
  assert.equal(calculateDensity20(Infinity,25), null);
});
test("out-of-curve loading temperature fails instead of saturating", () => {
  assert.equal(estimateLoadingTemperature(10000,1,840), null);
});
