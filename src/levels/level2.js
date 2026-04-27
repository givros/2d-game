(function () {
  "use strict";

  function createLevel({ GROUND_Y, WORLD_W }) {
    return {
      title: "JARDIN DES PLANTES",
      background: "level2",
      atlas: "level2",
      enemyKind: "plant",
      platforms: [
        { x: 0, y: GROUND_Y, w: WORLD_W, h: 86, kind: "ground" },
        { x: 610, y: 305, w: 170, h: 18, kind: "ledge" },
        { x: 1080, y: 288, w: 210, h: 18, kind: "ledge" },
        { x: 1620, y: 315, w: 130, h: 18, kind: "ledge" },
        { x: 2190, y: 298, w: 190, h: 18, kind: "ledge" },
        { x: 2865, y: 292, w: 210, h: 18, kind: "ledge" },
      ],
      coins: [
        [238, 304], [356, 302], [510, 304], [636, 265], [704, 253], [772, 265],
        [992, 302], [1104, 250], [1182, 240], [1260, 250], [1484, 302], [1662, 278],
        [1732, 270], [1952, 302], [2162, 302], [2225, 258], [2312, 247], [2394, 258],
        [2608, 302], [2818, 302], [2915, 252], [3002, 238], [3090, 252], [3418, 302],
      ],
      enemies: [
        { x: 570, min: 500, max: 760, speed: 38, dir: 1 },
        { x: 1170, min: 1010, max: 1325, speed: 46, dir: -1 },
        { x: 1810, min: 1660, max: 1945, speed: 42, dir: 1 },
        { x: 2500, min: 2320, max: 2680, speed: 52, dir: -1 },
        { x: 3190, min: 3020, max: 3400, speed: 50, dir: 1 },
      ],
      hazards: [
        { kind: "thorn", x: 875, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.2 },
        { kind: "thorn", x: 1450, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.9 },
        { kind: "thorn", x: 2510, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.55 },
        { kind: "thorn", x: 3290, y: GROUND_Y - 12, w: 74, h: 12, phase: 1.3 },
      ],
    };
  }

  window.GivrosLevel2 = {
    createLevel,
  };
})();
