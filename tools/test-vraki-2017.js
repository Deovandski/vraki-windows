// Checks the JavaScript port in site/vraki-2017.js against output captured from the
// 2017 Store app (docs/media/conversionTypes.png and screenshot-v1.3-2.png).
// Run: node tools/test-vraki-2017.js
"use strict";
const assert = require("node:assert/strict");
const V = require("../site/vraki-2017.js");

const input = "Look at my Horse! My horse is amazing! -Gentleman";
const expected = {
  "Default":       "Kxjbiqkbd- !Dkfwxjx pf bpole vj !Bpole vj qx hlli",
  "Simple Vraki":  "Look at my hol-li`lde! My hol-li`lde is amazing! -Gentleman",
  "Complex Vraki": "Tbi-rg`ldbzhoy- !Itzbiun ug voagf zm !Voagf zm ih yxaa",
  "Minimal":       "Mppl bu nz ipstf! Nz ipstf jt bnbajoh! -Hfoumfnbo",
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message.split("\n").join("\n     ")); }
}

for (const [preset, out] of Object.entries(expected)) {
  check(`${preset}: matches the 2017 app`, () => assert.equal(V.toVraki(input, V.PRESETS[preset]), out));
  check(`${preset}: preset is recognised`, () => assert.equal(V.presetName(V.PRESETS[preset]), preset));
}

// Round trips on the reversible building blocks. In 2017 the last character of the text
// always joins the last word, so only words followed by a word break round-trip; the tests
// end each sample with " x" for that reason.
const I = V._internal;
for (const s of ["look at my horse x", "amazing gentleman x", "abc def ghij klmno x"]) {
  check(`word pair reverse round trip: "${s}"`, () =>
    assert.equal(I.wordPairReverse(I.wordPairReverse(s, true), false), s));
}
check("shift round trip", () => assert.equal(I.shiftAll(I.shiftAll("hello, world", -3, true), -3, false), "hello, world"));
check("vraki structure round trip", () =>
  assert.equal(I.resolveVrakiStructure(I.resolveVrakiStructure("my horse is here", true), false), "my horse is here"));
check("empty text does not throw", () => { V.toVraki("", V.PRESETS.Default); V.fromVraki("", V.PRESETS.Default); });
check("short text does not throw", () => { for (const p of Object.values(V.PRESETS)) { V.toVraki("hi.yo", p); V.fromVraki("a", p); } });

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
