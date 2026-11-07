/*
 * Vraki Language (2017): the conversion engine, ported line by line to JavaScript.
 *
 * Source: legacy/Vraki Language/MainPage.xaml.cs (UWP app, 2017).
 * The algorithms are kept exactly as they were, quirks included, so the website
 * converts text the same way the Store app did. Where the 2017 code would throw
 * (and crash the app), this port stops quietly instead; those spots are marked.
 *
 * MIT License, Copyright (c) 2017 Deovandski Skibinski Junior.
 */
(function (root) {
  "use strict";

  var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  var consonants = "bcdfghjklmnpqrstvwxyz".split("");
  var vowels = "aeiou".split("");
  var vrakiToTranslate = ["hf", "la", "tu", "fs", "uf", "yn", "eb", "im", "id", "uk", "ud", "ne", "od",
    "sv", "au", "fn", "da", "rs", "kh", "oi", "ie", "rt"];
  var vrakiTranslated = ["c-rn`ld", "s-or`ld", "u-dx`ld", "a-ew`ld", "s-eh`ld", "t-is`ld", "h-tk`ld",
    "n-aj`ld", "e-ra`ld", "s-dc`ld", "o-ek`ld", "a-it`ld", "s-er`ld", "s-lc`ld", "c-kj`ld", "a-ts`ld", "e-om`ld", "l-li`ld", "e-mi`ld",
    "i-rg`ld", "r-mi`ld", "t-nx`ld"];
  var wordBreaks = [" ", ".", "/", "*", "-", ",", "!", "?", "|"];
  var toUpperCaseTriggers = [".", ",", "!", "?"];

  function has(list, c) { return list.indexOf(c) >= 0; }

  // The four presets from the app's "Conversion Type" menu.
  var PRESETS = {
    "Default":       { reverse: true,  reverseType: 1, shift: true,  vowelSeparately: false, shiftBy: -3,  vowelShiftBy: 0, vrakiStructure: false, letterCase: true },
    "Simple Vraki":  { reverse: false, reverseType: 1, shift: false, vowelSeparately: false, shiftBy: 0,   vowelShiftBy: 0, vrakiStructure: true,  letterCase: true },
    "Complex Vraki": { reverse: true,  reverseType: 5, shift: true,  vowelSeparately: true,  shiftBy: -10, vowelShiftBy: 2, vrakiStructure: true,  letterCase: true },
    "Minimal":       { reverse: false, reverseType: 1, shift: true,  vowelSeparately: false, shiftBy: 1,   vowelShiftBy: 0, vrakiStructure: false, letterCase: true }
  };

  var REVERSE_TYPES = {
    1: "Char Reverse",
    2: "Word Reverse",
    3: "Word Pair Reverse",
    4: "Char + Word Reverse",
    5: "Char + Word Pair Reverse"
  };

  // Same check as detectCustomSettings(): which preset (if any) the settings match.
  function presetName(s) {
    if (s.reverse && s.shift && !s.vowelSeparately && s.vowelShiftBy === 0 && s.shiftBy === -3 && s.reverseType === 1 && !s.vrakiStructure && s.letterCase) return "Default";
    if (!s.reverse && !s.shift && !s.vowelSeparately && s.vowelShiftBy === 0 && s.shiftBy === 0 && s.vrakiStructure && s.letterCase) return "Simple Vraki";
    if (s.reverse && s.shift && s.vowelSeparately && s.vowelShiftBy === 2 && s.shiftBy === -10 && s.reverseType === 5 && s.vrakiStructure && s.letterCase) return "Complex Vraki";
    if (!s.reverse && s.shift && !s.vowelSeparately && s.vowelShiftBy === 0 && s.shiftBy === 1 && !s.vrakiStructure && s.letterCase) return "Minimal";
    return "Custom";
  }

  // ---------------- Reverse algorithms ----------------

  function charReverse(text) {
    return text.split("").reverse().join("");
  }

  function wordReverse(text) {
    var out = [], word = [], last = text.length - 1, withinWord = false;
    for (var i = 0; i <= last; i++) {
      var c = text.charAt(i);
      if (has(wordBreaks, c) || i === last) {
        if (!withinWord) {
          out.push(c);
        } else {
          for (var x = word.length - 1; x >= 0; x--) out.push(word[x]);
          withinWord = false;
          word = [];
          out.push(c);
        }
      } else {
        withinWord = true;
        word.push(c);
      }
    }
    return out.join("");
  }

  function findOddMedian(size) { return Math.trunc((size - 1) / 2) + 1; }
  function isOdd(n) { return n % 2 !== 0; }

  function wordPairReverse(text, toVraki) {
    var out = [], word = [], last = text.length - 1;
    var withinWord = false, oddWord = false, medianChar = " ";
    for (var i = 0; i <= last; i++) {
      var c = text.charAt(i);
      if (has(wordBreaks, c) || i === last) {
        if (i === last) word.push(c);
        if (!withinWord || word.length === 1) {
          out.push(c);
        } else {
          oddWord = isOdd(word.length);
          var pairs = Math.trunc(word.length / 2);
          var size = word.length - 1;
          if (oddWord && toVraki) {
            var mid = findOddMedian(size);
            medianChar = word[mid];
            word.splice(mid, 1);
            size -= 1;
          } else if (oddWord && !toVraki) {
            medianChar = word[size];
            word.splice(size, 1);
            size -= 1;
          }
          var x;
          if (toVraki) {
            for (x = 0; x < pairs; x++) {
              out.push(word[size - x]);
              out.push(word[x]);
            }
          } else {
            for (x = 1; x <= size; x += 2) out.push(word[x]);
            if (oddWord) out.push(medianChar);
            size -= 1;
            for (x = size; x >= 0; x -= 2) out.push(word[x]);
          }
          if (oddWord && toVraki) out.push(medianChar);
          if (has(wordBreaks, c)) out.push(c);
          withinWord = false;
          oddWord = false;
          word = [];
        }
      } else {
        withinWord = true;
        word.push(c);
      }
    }
    return out.join("");
  }

  function charWordReverse(text, toVraki) {
    return toVraki ? wordReverse(charReverse(text)) : charReverse(wordReverse(text));
  }

  function charWordPairReverse(text, toVraki) {
    return toVraki ? wordPairReverse(charReverse(text), true) : charReverse(wordPairReverse(text, false));
  }

  function reverse(text, type, toVraki) {
    switch (type) {
      case 1: return charReverse(text);
      case 2: return wordReverse(text);
      case 3: return wordPairReverse(text, toVraki);
      case 4: return charWordReverse(text, toVraki);
      case 5: return charWordPairReverse(text, toVraki);
      default: return text;
    }
  }

  // ---------------- Shift algorithms ----------------

  function wrap(pos, n) {
    if (pos > n - 1) pos -= n;
    if (pos < 0) pos += n;
    return pos;
  }

  function shiftAll(text, shiftBy, toVraki) {
    if (!toVraki) shiftBy *= -1;
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i), p = alphabet.indexOf(c);
      out.push(p < 0 ? c : alphabet[wrap(p + shiftBy, 26)]);
    }
    return out.join("");
  }

  function shiftSeparately(text, consonantBy, vowelBy, toVraki) {
    if (!toVraki) { consonantBy *= -1; vowelBy *= -1; }
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i), cp = consonants.indexOf(c), vp = vowels.indexOf(c);
      if (cp >= 0) out.push(consonants[wrap(cp + consonantBy, 21)]);
      else if (vp >= 0) out.push(vowels[wrap(vp + vowelBy, 5)]);
      else out.push(c);
    }
    return out.join("");
  }

  // ---------------- Vraki Structure ----------------

  function resolveVrakiStructure(text, toVraki) {
    var out = [], last = text.length - 1, i, idx;
    if (toVraki) {
      for (i = 0; i <= last; i++) {
        if (i === last) { out.push(text.charAt(i)); break; }
        idx = vrakiToTranslate.indexOf(text.substr(i, 2));
        if (idx >= 0) {
          out.push(vrakiTranslated[idx]);
          i++;
        } else {
          out.push(text.charAt(i));
        }
      }
    } else {
      for (i = 0; i <= last; i++) {
        if (i > last - 6) { out.push(text.substring(i)); break; }
        idx = vrakiTranslated.indexOf(text.substr(i, 7));
        if (idx >= 0) {
          out.push(vrakiToTranslate[idx]);
          i += 6;
        } else {
          out.push(text.charAt(i));
        }
      }
    }
    return out.join("");
  }

  // ---------------- Letter Case Fix ----------------

  function resolveLetterCase(text) {
    // 2017: an empty text threw here. The port returns it unchanged.
    if (text.length === 0) return text;
    var out = [], last = text.length - 1;
    var first = text.charAt(0);
    out.push(has(alphabet, first) ? first.toUpperCase() : first);
    if (last < 3) return out.join("") + text.substring(1);

    var i;
    for (i = 1; i <= last - 2; i++) {
      var prev = text.charAt(i - 1), cur = text.charAt(i), next = text.charAt(i + 1), after = text.charAt(i + 2);
      out.push(cur);
      if (has(wordBreaks, prev) && cur === "-" && has(alphabet, next)) {
        out.push(next.toUpperCase());
        i++;
      } else if (has(toUpperCaseTriggers, cur) && has(alphabet, next)) {
        out.push(next.toUpperCase());
        i++;
      } else if (has(toUpperCaseTriggers, cur) && !has(alphabet, next) && has(alphabet, after)) {
        out.push(next.toUpperCase());
        out.push(after.toUpperCase());
        i += 2;
      }
    }
    // Add whatever the loop didn't reach. 2017: when the loop had already jumped
    // past the end, this read beyond the text and threw. The port stops instead.
    for (var k = i; k <= last; k++) out.push(text.charAt(k));
    return out.join("");
  }

  // ---------------- Translation flow ----------------

  // 1st Reverse | 2nd Shift | 3rd Vraki Structure | 4th Letter Case
  function toVraki(text, s) {
    text = text.toLowerCase();
    if (text.length === 0) return text;
    if (s.reverse) text = reverse(text, s.reverseType, true);
    if (s.shift) text = s.vowelSeparately ? shiftSeparately(text, s.shiftBy, s.vowelShiftBy, true) : shiftAll(text, s.shiftBy, true);
    if (s.vrakiStructure) text = resolveVrakiStructure(text, true);
    if (s.letterCase) text = resolveLetterCase(text);
    return text;
  }

  // 1st Vraki Structure | 2nd Shift | 3rd Reverse | 4th Letter Case
  function fromVraki(text, s) {
    text = text.toLowerCase();
    if (s.vrakiStructure) text = resolveVrakiStructure(text, false);
    if (s.shift) text = s.vowelSeparately ? shiftSeparately(text, s.shiftBy, s.vowelShiftBy, false) : shiftAll(text, s.shiftBy, false);
    if (s.reverse) text = reverse(text, s.reverseType, false);
    if (s.letterCase) text = resolveLetterCase(text);
    return text;
  }

  var api = {
    PRESETS: PRESETS,
    REVERSE_TYPES: REVERSE_TYPES,
    presetName: presetName,
    toVraki: toVraki,
    fromVraki: fromVraki,
    _internal: {
      charReverse: charReverse, wordReverse: wordReverse, wordPairReverse: wordPairReverse,
      shiftAll: shiftAll, shiftSeparately: shiftSeparately,
      resolveVrakiStructure: resolveVrakiStructure, resolveLetterCase: resolveLetterCase
    }
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Vraki2017 = api;
})(typeof self !== "undefined" ? self : this);
