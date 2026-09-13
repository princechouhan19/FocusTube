/**
 * FocusTube — Companion Art (v1.17.0 "Anime Duo")
 * ================================================
 * Mika (girl) & Haru (boy) — parametric chibi-anime focus buddies, drawn
 * entirely as inline SVG. No dependencies, no WebGL, no model downloads.
 *
 * Why authored art instead of an open-source 3D model:
 *   · We searched for a redistributable open-source 3D anime duo (VRM /
 *     VRoid / Sketchfab / BlendSwap / Free3D). Result: no male+female pair
 *     ships under a license that allows bundling in a distributed Chrome
 *     extension, and none exposes a full emotion set (blendshapes). VRoid
 *     models are "permissive but not CC0" and per-model licensed.
 *   · Per product decision, the duo is authored in-house: 2 characters ×
 *     8 emotion faces × 4 poses as ~16 KB of vector art. Crisp at every
 *     DPI, zero battery cost, safe inside closed ShadowRoots.
 *
 * Emotions: joyful · happy · neutral · worried · sad · surprised · sleepy · proud
 * Poses:    idle · wave · guide (points left, at your content) · cheer
 *
 * API:
 *   FTCompanionArt.render({ character, emotion, pose, size, idPrefix, animate })
 *     → "<svg …>…</svg>" string (gradients namespaced by idPrefix).
 *   FTCompanionArt.CHARACTERS / EMOTIONS / POSES
 *   FTCompanionArt.emotionForMood(mood) → maps companion.js moods.
 *
 * Accessibility & motion: aria-label on the root svg; every animation is
 * disabled under prefers-reduced-motion via an embedded media query.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Character palettes
  // ---------------------------------------------------------------------------
  const CHARACTERS = {
    mika: {
      key: "mika",
      name: "Mika",
      tag: "Warm & cheery",
      hair: "#B56E8C",
      hairDark: "#8E4E6C",
      hairHi: "#EDA9C3",
      lash: "#5E3550",
      irisTop: "#177E70",
      irisBot: "#5FD9C4",
      outfit: "#FFF3E0",
      outfitDark: "#EBD3AE",
      trim: "#2FB8A6",
      shoe: "#2FB8A6",
      accessory: "clip",
    },
    haru: {
      key: "haru",
      name: "Haru",
      tag: "Calm & steady",
      hair: "#4A5578",
      hairDark: "#39415F",
      hairHi: "#8B9CCB",
      lash: "#2E3450",
      irisTop: "#9A5F14",
      irisBot: "#F5C063",
      outfit: "#5A6B96",
      outfitDark: "#46547A",
      trim: "#F0B45A",
      shoe: "#F0B45A",
      accessory: "headphones",
    },
  };

  const EMOTIONS = ["joyful", "happy", "neutral", "worried", "sad", "surprised", "sleepy", "proud"];
  const POSES = ["idle", "wave", "guide", "cheer"];

  const MOOD_TO_EMOTION = {
    idle: "neutral",
    good: "happy",
    warn: "worried",
    danger: "sad",
    cheer: "joyful",
    sleep: "sleepy",
  };

  let uid = 0;

  // ---------------------------------------------------------------------------
  // Small path helpers
  // ---------------------------------------------------------------------------
  function sparklePath(cx, cy, r) {
    const s = r * 0.28;
    return (
      `M${cx} ${cy - r} C${cx + s * 0.4} ${cy - s} ${cx + s} ${cy - s * 0.4} ${cx + r} ${cy} ` +
      `C${cx + s} ${cy + s * 0.4} ${cx + s * 0.4} ${cy + s} ${cx} ${cy + r} ` +
      `C${cx - s * 0.4} ${cy + s} ${cx - s} ${cy + s * 0.4} ${cx - r} ${cy} ` +
      `C${cx - s} ${cy - s * 0.4} ${cx - s * 0.4} ${cy - s} ${cx} ${cy - r} Z`
    );
  }

  function starPath(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rad = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)} ${(cy + rr * Math.sin(rad)).toFixed(1)}`);
    }
    return `M${pts.join(" L")} Z`;
  }

  function dropPath(cx, cy, w, h) {
    return `M${cx} ${cy - h / 2} C${cx - w / 2} ${cy} ${cx - w * 0.42} ${cy + h * 0.28} ${cx} ${cy + h * 0.32} C${cx + w * 0.42} ${cy + h * 0.28} ${cx + w / 2} ${cy} ${cx} ${cy - h / 2} Z`;
  }

  // ---------------------------------------------------------------------------
  // Eyes — each builder returns inner SVG for BOTH eyes.
  // Eye centers: L(79,100) R(121,100). Each eye group is translated there.
  // ---------------------------------------------------------------------------
  function eyeOpenGroup(cx, cfg, C, gradId) {
    const irisR = cfg.irisR || 8;
    const lash = cfg.lashRaised
      ? `M-12 -7 Q0 -16 12 -7`
      : cfg.lashDroop
        ? `M-12 -4.5 Q0 -10 12 -4.5`
        : `M-12 -7 Q0 -14 12 -7`;
    return `
      <g transform="translate(${cx} 100)" class="ct-eye">
        <ellipse rx="10.5" ry="12.5" fill="#FFFFFF"/>
        <circle r="${irisR}" fill="url(#${gradId})"/>
        <ellipse cy="0.5" rx="3.2" ry="4.2" fill="#241E28"/>
        <circle cx="-3" cy="-4.5" r="2.6" fill="#FFFFFF"/>
        <circle cx="3.6" cy="2.5" r="1.3" fill="#FFFFFF" opacity=".9"/>
        <path d="${lash}" stroke="${C.lash}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
        <path d="M-9 12 Q0 15 9 12" stroke="${C.lash}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".22"/>
      </g>`;
  }

  function eyesOpen(cfg, C, idp) {
    const gradId = `${idp}iris`;
    return (
      eyeOpenGroup(79, cfg, C, gradId) +
      eyeOpenGroup(121, cfg, C, gradId)
    );
  }

  function eyesJoyful(C) {
    const arc = (cx, flick) => `
      <g transform="translate(${cx} 100)">
        <path d="M-12 2 Q0 -10 12 2" stroke="${C.lash}" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${flick ? `<path d="M11.5 -1 L15 -5" stroke="${C.lash}" stroke-width="3.4" stroke-linecap="round"/>` : ""}
      </g>`;
    return arc(79, false) + arc(121, true);
  }

  function eyesProud(C) {
    const arc = (cx, flick) => `
      <g transform="translate(${cx} 100)">
        <path d="M-12 1 Q0 -7.5 12 1" stroke="${C.lash}" stroke-width="4.8" fill="none" stroke-linecap="round"/>
        ${flick ? `<path d="M11.5 -1.5 L15 -5" stroke="${C.lash}" stroke-width="3.2" stroke-linecap="round"/>` : ""}
      </g>`;
    return arc(79, false) + arc(121, true);
  }

  function eyesSleepy(C) {
    const arc = (cx) => `
      <g transform="translate(${cx} 100)">
        <path d="M-11 -1 Q0 7 11 -1" stroke="${C.lash}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
      </g>`;
    return arc(79) + arc(121);
  }

  // ---------------------------------------------------------------------------
  // Brows — stroke paths, brow color follows hair shadow
  // ---------------------------------------------------------------------------
  function browsFor(emotion, C) {
    const s = `stroke="${C.hairDark}" stroke-width="4.6" fill="none" stroke-linecap="round"`; // drawn OVER the bangs (anime convention) so tilts stay readable
    switch (emotion) {
      case "joyful":
        return `<path d="M64 79 Q75 74 86 77" ${s}/><path d="M136 79 Q125 74 114 77" ${s}/>`;
      case "proud":
        // asymmetric — left relaxed, right raised (matches the smirk)
        return `<path d="M64 84 Q75 82 86 84" ${s}/><path d="M114 80 Q126 74 136 80" ${s}/>`;
      case "neutral":
        return `<path d="M64 84 Q75 79 86 82" ${s}/><path d="M136 84 Q125 79 114 82" ${s}/>`;
      case "worried":
        return `<path d="M62 87 Q75 83 87 78" ${s}/><path d="M138 87 Q125 83 113 78" ${s}/>`;
      case "sad":
        return `<path d="M62 89 Q75 85 87 77" ${s}/><path d="M138 89 Q125 85 113 77" ${s}/>`;
      case "surprised":
        return `<path d="M64 77 Q75 70 86 75" ${s}/><path d="M136 77 Q125 70 114 75" ${s}/>`;
      case "sleepy":
        return `<path d="M64 89 Q75 89 86 88" ${s}/><path d="M136 89 Q125 89 114 88" ${s}/>`;
      default: // happy
        return `<path d="M64 82 Q75 77 86 80" ${s}/><path d="M136 82 Q125 77 114 80" ${s}/>`;
    }
  }

  // ---------------------------------------------------------------------------
  // Mouths
  // ---------------------------------------------------------------------------
  function mouthFor(emotion) {
    const m = "#8C4452";
    switch (emotion) {
      case "joyful":
        return `
          <path d="M85 114 Q100 138 115 114 Q100 120 85 114 Z" fill="${m}"/>
          <ellipse cx="100" cy="127" rx="6.5" ry="4" fill="#F08A93"/>`;
      case "happy":
        return `<path d="M88 117 Q100 128 112 117" stroke="${m}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
      case "neutral":
        return `<path d="M92 119 Q100 125 108 119" stroke="${m}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      case "worried":
        return `<path d="M90 121 Q95 116 100 121 Q105 126 110 121" stroke="${m}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      case "sad":
        return `<path d="M90 126 Q100 116 110 126" stroke="${m}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
      case "surprised":
        return `<ellipse cx="100" cy="121" rx="6" ry="7.5" fill="${m}"/>`;
      case "sleepy":
        return `<ellipse cx="100" cy="121" rx="4.5" ry="5.5" fill="${m}"/>`;
      case "proud":
        return `<path d="M90 121 Q101 125 112 113" stroke="${m}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
      default:
        return `<path d="M92 119 Q100 125 108 119" stroke="${m}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    }
  }

  // ---------------------------------------------------------------------------
  // Face assembly per emotion: brows + eyes + blush + mouth + floating extra
  // ---------------------------------------------------------------------------
  function faceFor(emotion, C, idp) {
    let eyes;
    if (emotion === "joyful") eyes = eyesJoyful(C);
    else if (emotion === "proud") eyes = eyesProud(C);
    else if (emotion === "sleepy") eyes = eyesSleepy(C);
    else if (emotion === "surprised") eyes = eyesOpen({ irisR: 9, lashRaised: true }, C, idp);
    else if (emotion === "sad") eyes = eyesOpen({ irisR: 7, lashDroop: true }, C, idp);
    else if (emotion === "worried") eyes = eyesOpen({ irisR: 7.5 }, C, idp);
    else eyes = eyesOpen({}, C, idp); // happy / neutral

    // open-eye emotions get the blink animation wrapper
    const openEyeEmotions = ["happy", "neutral", "worried", "sad", "surprised"];
    if (openEyeEmotions.includes(emotion)) {
      eyes = `<g class="ct-blink">${eyes}</g>`;
    }

    const blushOpacity = {
      joyful: 0.7, happy: 0.5, neutral: 0.32, worried: 0.3,
      sad: 0.3, surprised: 0.3, sleepy: 0.25, proud: 0.55,
    }[emotion] || 0.32;
    const blush = `
      <ellipse cx="60" cy="112" rx="8" ry="4.5" fill="#FF93A8" opacity="${blushOpacity}"/>
      <ellipse cx="140" cy="112" rx="8" ry="4.5" fill="#FF93A8" opacity="${blushOpacity}"/>`;

    let extra = "";
    if (emotion === "joyful") {
      extra = `
        <path class="ct-fx ct-fx1" d="${sparklePath(32, 46, 8)}" fill="#FFD60A"/>
        <path class="ct-fx ct-fx2" d="${sparklePath(170, 58, 6)}" fill="#FFD60A"/>
        <path class="ct-fx ct-fx3" d="${sparklePath(26, 118, 5)}" fill="#FFD60A"/>
        <path class="ct-fx ct-fx4" d="${sparklePath(174, 124, 6.5)}" fill="#FFD60A"/>`;
    } else if (emotion === "sad") {
      extra = `
        <path class="ct-tear" d="${dropPath(63, 112, 7, 13)}" fill="#7FD4F0" opacity=".95"/>
        <path d="${dropPath(137, 108, 4.5, 8)}" fill="#7FD4F0" opacity=".7"/>`;
    } else if (emotion === "worried") {
      extra = `<path class="ct-sweat" d="${dropPath(152, 52, 9, 17)}" fill="#A5DDF5" opacity=".95"/>`;
    } else if (emotion === "surprised") {
      extra = `
        <g class="ct-pop">
          <rect x="157" y="14" width="6" height="18" rx="3" fill="#FF9F0A"/>
          <circle cx="160" cy="40" r="4" fill="#FF9F0A"/>
        </g>`;
    } else if (emotion === "sleepy") {
      extra = `
        <text class="ct-zz ct-zz1" x="134" y="44" font-size="15">Z</text>
        <text class="ct-zz ct-zz2" x="148" y="30" font-size="12">z</text>
        <text class="ct-zz ct-zz3" x="159" y="20" font-size="9.5">z</text>`;
    } else if (emotion === "proud") {
      extra = `<path class="ct-pop" d="${starPath(158, 32, 10)}" fill="#FFD60A" stroke="#E8A50F" stroke-width="1.2"/>`;
    }

    return { brows: browsFor(emotion, C), eyes, blush, mouth: mouthFor(emotion), extra };
  }

  // ---------------------------------------------------------------------------
  // Arms per pose. Sleeves are thick round strokes (hoodie color), hands are
  // skin circles. `guide` points to the viewer's LEFT (buddy sits on the
  // right edge of full-screen layouts, pointing at the content).
  // ---------------------------------------------------------------------------
  function armsFor(pose, C) {
    const sleeve = `stroke="${C.outfitDark}" stroke-width="13" fill="none" stroke-linecap="round"`;
    const skin = "#FFE3CC";
    const idleL = `<path d="M70 150 C60 162 55 176 57 190" ${sleeve}/><circle cx="57" cy="193" r="6.5" fill="${skin}"/>`;
    const idleR = `<path d="M130 150 C140 162 145 176 143 190" ${sleeve}/><circle cx="143" cy="193" r="6.5" fill="${skin}"/>`;

    if (pose === "wave") {
      return {
        left: idleL,
        right: `
          <g class="ct-arm-w">
            <path d="M130 150 C146 146 154 132 152 116" ${sleeve}/>
            <circle cx="152" cy="112" r="7" fill="${skin}"/>
          </g>`,
        rootClass: "",
      };
    }
    if (pose === "guide") {
      return {
        left: `
          <g class="ct-arm-g">
            <path d="M70 150 C56 146 44 142 32 144" ${sleeve}/>
            <circle cx="30" cy="144" r="6.5" fill="${skin}"/>
            <circle cx="24" cy="143" r="2.8" fill="${skin}"/>
          </g>`,
        right: idleR,
        rootClass: "",
      };
    }
    if (pose === "cheer") {
      return {
        left: `<path d="M70 150 C56 146 48 132 46 116" ${sleeve}/><circle cx="46" cy="112" r="7" fill="${skin}"/>`,
        right: `<path d="M130 150 C144 146 152 132 154 116" ${sleeve}/><circle cx="154" cy="112" r="7" fill="${skin}"/>`,
        rootClass: "ct-cheer-b",
      };
    }
    return { left: idleL, right: idleR, rootClass: "" };
  }

  // ---------------------------------------------------------------------------
  // Legs, shoes, torso (shared body, palette-driven)
  // ---------------------------------------------------------------------------
  function bodySVG(C) {
    const skinShadow = "#F2BE9A";
    return `
      <rect x="81" y="200" width="13" height="23" rx="6" fill="${skinShadow}"/>
      <rect x="106" y="200" width="13" height="23" rx="6" fill="${skinShadow}"/>
      <rect x="80" y="219" width="15" height="9" rx="4.5" fill="#FFFFFF" stroke="rgba(40,30,50,.08)"/>
      <rect x="105" y="219" width="15" height="9" rx="4.5" fill="#FFFFFF" stroke="rgba(40,30,50,.08)"/>
      <rect x="75" y="226" width="22" height="13" rx="6.5" fill="${C.shoe}"/>
      <rect x="103" y="226" width="22" height="13" rx="6.5" fill="${C.shoe}"/>
      <rect x="64" y="138" width="72" height="64" rx="22" fill="url(#__IDP__outfit)"/>
      <rect x="64" y="190" width="72" height="12" rx="6" fill="${C.outfitDark}" opacity=".9"/>
      <path d="M84 182 Q100 192 116 182" stroke="${C.outfitDark}" stroke-width="3" fill="none" opacity=".7"/>
      <path d="M91 148 L89 163" stroke="${C.trim}" stroke-width="3" stroke-linecap="round"/>
      <path d="M109 148 L111 163" stroke="${C.trim}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="89" cy="165" r="2.2" fill="${C.trim}"/>
      <circle cx="111" cy="165" r="2.2" fill="${C.trim}"/>`;
  }

  // ---------------------------------------------------------------------------
  // Hair — back layer (behind head), tails (behind body), fringe (over face)
  // ---------------------------------------------------------------------------
  function hairBackAndTails(C) {
    const grad = `url(#__IDP__hair)`;
    if (C.key === "mika") {
      return `
        <ellipse cx="100" cy="78" rx="56" ry="54" fill="${C.hairDark}"/>
        <path d="M52 58 C28 82 18 130 34 170 C40 184 58 181 55 166 C47 134 56 96 68 72 Z" fill="${grad}"/>
        <path d="M148 58 C172 82 182 130 166 170 C160 184 142 181 145 166 C153 134 144 96 132 72 Z" fill="${grad}"/>
        <circle cx="55" cy="61" r="6.5" fill="${C.trim}"/>
        <circle cx="145" cy="61" r="6.5" fill="${C.trim}"/>
        <circle cx="53.5" cy="59" r="2" fill="#FFFFFF" opacity=".55"/>
        <circle cx="143.5" cy="59" r="2" fill="#FFFFFF" opacity=".55"/>`;
    }
    // haru
    return `<ellipse cx="100" cy="76" rx="55" ry="51" fill="${C.hairDark}"/>`;
  }

  function hairFront(C) {
    const grad = `url(#__IDP__hair)`;
    const shine = (d, w) =>
      `<path d="${d}" stroke="${C.hairHi}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity=".6"/>`;
    if (C.key === "mika") {
      return `
        <path d="M52 94 C48 56 66 30 100 28 C134 30 152 56 148 94 C143 76 137 84 133 70 C127 84 118 64 111 76 C105 64 95 80 89 66 C83 82 74 62 69 78 C64 66 57 78 52 94 Z" fill="${grad}"/>
        <path d="M50 80 C44 102 44 122 50 136 C57 132 60 114 57 96 Z" fill="${C.hair}"/>
        <path d="M150 80 C156 102 156 122 150 136 C143 132 140 114 143 96 Z" fill="${C.hair}"/>
        ${shine("M66 50 C78 42 90 46 100 42 C112 38 124 42 136 48", 5.5)}
        <path d="M102 28 C100 14 112 8 118 14" stroke="${C.hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <g transform="rotate(-8 134 82)">
          <rect x="128" y="79" width="14" height="7" rx="3.5" fill="${C.trim}"/>
          <line x1="130" y1="81.5" x2="140" y2="81.5" stroke="#FFFFFF" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>
        </g>`;
    }
    // haru
    return `
      <path d="M50 92 C46 54 64 28 100 26 C136 28 154 54 150 92 L142 68 L133 88 L123 60 L112 82 L101 56 L90 82 L79 62 L69 86 L58 66 Z" fill="${grad}"/>
      <path d="M76 36 L68 16 L92 30 Z" fill="${C.hair}"/>
      <path d="M104 28 L110 8 L126 26 Z" fill="${C.hair}"/>
      <path d="M50 78 C47 96 47 110 51 122 C55 118 56 104 54 92 Z" fill="${C.hair}"/>
      <path d="M150 78 C153 96 153 110 149 122 C145 118 144 104 146 92 Z" fill="${C.hair}"/>
      ${shine("M64 46 C76 40 88 44 100 40 C112 36 124 40 138 46", 5)}`;
  }

  function headphonesSVG() {
    return `
      <path d="M64 138 C70 156 130 156 136 138" stroke="#2E3444" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="46" y="124" width="20" height="30" rx="9" fill="#2E3444"/>
      <rect x="50" y="129" width="12" height="20" rx="6" fill="__TRIM__" opacity=".9"/>
      <rect x="134" y="124" width="20" height="30" rx="9" fill="#2E3444"/>
      <rect x="138" y="129" width="12" height="20" rx="6" fill="__TRIM__" opacity=".9"/>`;
  }

  // ---------------------------------------------------------------------------
  // Embedded stylesheet (namespaced animation names, reduced-motion safe)
  // ---------------------------------------------------------------------------
  function styleSVG() {
    return `
    <style>
      .ct-root text { font-family: ui-rounded, -apple-system, 'SF Pro Text', 'Segoe UI', Arial, sans-serif; font-weight: 700; fill: #98A0B4; }
      .ct-blink { animation: ctBlink 4.8s infinite; transform-origin: 100px 100px; }
      @keyframes ctBlink { 0%, 93%, 100% { transform: scaleY(1); } 95.5%, 97% { transform: scaleY(.07); } }
      .ct-in { animation: ctIn .5s cubic-bezier(.34,1.56,.64,1); transform-origin: 100px 240px; }
      @keyframes ctIn { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.03); opacity: 1; } 100% { transform: scale(1); } }
      .ct-bob { animation: ctBob 3.6s ease-in-out infinite; transform-origin: 100px 240px; }
      @keyframes ctBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      .ct-arm-w { animation: ctWave 1.9s ease-in-out infinite; transform-origin: 130px 150px; transform-box: view-box; }
      @keyframes ctWave { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(12deg); } }
      .ct-arm-g { animation: ctGuide 2.6s ease-in-out infinite; transform-origin: 70px 150px; transform-box: view-box; }
      @keyframes ctGuide { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-2.5px, -1.5px); } }
      .ct-cheer-b { animation: ctCheer .95s ease-in-out infinite; transform-origin: 100px 240px; }
      @keyframes ctCheer { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      .ct-fx { transform-box: fill-box; transform-origin: center; animation: ctTwinkle 1.6s ease-in-out infinite; }
      .ct-fx2 { animation-delay: .35s; } .ct-fx3 { animation-delay: .7s; } .ct-fx4 { animation-delay: 1.05s; }
      @keyframes ctTwinkle { 0%, 100% { opacity: .25; transform: scale(.72); } 50% { opacity: 1; transform: scale(1.08); } }
      .ct-tear { transform-box: fill-box; transform-origin: center; animation: ctTear 2.2s ease-in infinite; }
      @keyframes ctTear { 0% { opacity: 0; transform: translateY(-2px); } 25% { opacity: .95; } 100% { opacity: 0; transform: translateY(11px); } }
      .ct-sweat { transform-box: fill-box; transform-origin: center; animation: ctSweat 2.4s ease-in-out infinite; }
      @keyframes ctSweat { 0%, 100% { transform: translateY(0); opacity: .95; } 50% { transform: translateY(3px); opacity: .7; } }
      .ct-pop { transform-box: fill-box; transform-origin: center; animation: ctPop .55s cubic-bezier(.34,1.56,.64,1); }
      @keyframes ctPop { 0% { transform: scale(0); opacity: 0; } 65% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }
      .ct-zz { animation: ctZz 2.6s ease-in-out infinite; }
      .ct-zz2 { animation-delay: .5s; } .ct-zz3 { animation-delay: 1s; }
      @keyframes ctZz { 0% { opacity: 0; transform: translate(0, 4px); } 40% { opacity: .9; } 100% { opacity: 0; transform: translate(4px, -6px); } }
      @media (prefers-reduced-motion: reduce) {
        .ct-root *, .ct-root { animation: none !important; }
      }
    </style>`;
  }

  // ---------------------------------------------------------------------------
  // Main renderer
  // ---------------------------------------------------------------------------
  function render(opts = {}) {
    const C = CHARACTERS[opts.character] || CHARACTERS.mika;
    const emotion = EMOTIONS.includes(opts.emotion) ? opts.emotion : "neutral";
    const pose = POSES.includes(opts.pose) ? opts.pose : "idle";
    const size = Math.max(32, Number(opts.size) || 140);
    const idp = (opts.idPrefix || `cta${++uid}`) + "-";
    const face = faceFor(emotion, C, idp);
    const arms = armsFor(pose, C);

    let svg = `
    <svg class="ct-root" viewBox="0 0 200 250" width="${size}" height="${Math.round(size * 1.25)}"
         role="img" aria-label="${C.name}, the FocusTube focus buddy, feeling ${emotion}">
      ${styleSVG()}
      <defs>
        <radialGradient id="${idp}skin" cx="42%" cy="30%" r="85%">
          <stop offset="0%" stop-color="#FFF0E2"/>
          <stop offset="100%" stop-color="#FFDDBE"/>
        </radialGradient>
        <linearGradient id="${idp}hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${C.hair}"/>
          <stop offset="100%" stop-color="${C.hairDark}"/>
        </linearGradient>
        <linearGradient id="${idp}iris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${C.irisTop}"/>
          <stop offset="100%" stop-color="${C.irisBot}"/>
        </linearGradient>
        <linearGradient id="${idp}outfit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${C.outfit}"/>
          <stop offset="100%" stop-color="${C.outfitDark}"/>
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="240" rx="44" ry="6" fill="rgba(20,16,28,.18)"/>
      <g class="ct-in">
      <g class="ct-bob ${arms.rootClass}">
        ${hairBackAndTails(C)}
        ${bodySVG(C)}
        <rect x="93" y="126" width="14" height="16" rx="5" fill="#F5C9A5"/>
        ${arms.left}
        ${arms.right}
        <ellipse cx="100" cy="88" rx="50" ry="47" fill="url(#${idp}skin)"/>
        ${face.eyes}
        ${face.blush}
        ${face.mouth}
        ${hairFront(C)}
        ${face.brows}
        ${C.accessory === "headphones" ? headphonesSVG().replace(/__TRIM__/g, C.trim) : ""}
        ${face.extra}
      </g>
      </g>
    </svg>`;

    // body/hair builders use a placeholder token; bind them to this instance's
    // gradient ids so multiple buddies can coexist on one page.
    return svg.replace(/__IDP__/g, idp);
  }

  window.FTCompanionArt = {
    render,
    CHARACTERS,
    EMOTIONS,
    POSES,
    emotionForMood: (m) => MOOD_TO_EMOTION[m] || "neutral",
  };
})();
