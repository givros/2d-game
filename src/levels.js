(function () {
  "use strict";

  function createLevelTemplates({ GROUND_Y, WORLD_W }) {
    return [
      {
        title: "MONTPELLIER RUN",
        background: "level1",
        atlas: "level1",
        enemyKind: "rat",
        platforms: [
          { x: 0, y: GROUND_Y, w: WORLD_W, h: 86, kind: "ground" },
          { x: 670, y: 306, w: 150, h: 18, kind: "ledge" },
          { x: 1188, y: 294, w: 180, h: 18, kind: "ledge" },
          { x: 1760, y: 314, w: 118, h: 18, kind: "ledge" },
          { x: 2280, y: 302, w: 166, h: 18, kind: "ledge" },
          { x: 2910, y: 300, w: 190, h: 18, kind: "ledge" },
        ],
        coins: [
          [248, 304], [374, 302], [520, 304], [690, 266], [746, 258], [805, 266],
          [1012, 303], [1178, 256], [1241, 244], [1306, 256], [1510, 302], [1680, 302],
          [1813, 276], [1994, 302], [2178, 302], [2306, 263], [2368, 255], [2432, 263],
          [2624, 302], [2820, 302], [2944, 262], [3010, 252], [3076, 262], [3405, 302],
        ],
        enemies: [
          { x: 575, y: GROUND_Y - 22, min: 510, max: 770, speed: 42, dir: 1 },
          { x: 1050, y: GROUND_Y - 22, min: 960, max: 1245, speed: 54, dir: -1 },
          { x: 1565, y: GROUND_Y - 22, min: 1460, max: 1700, speed: 46, dir: 1 },
          { x: 2165, y: GROUND_Y - 22, min: 2050, max: 2350, speed: 58, dir: -1 },
          { x: 2755, y: GROUND_Y - 22, min: 2655, max: 2960, speed: 54, dir: 1 },
          { x: 3230, y: GROUND_Y - 22, min: 3110, max: 3440, speed: 64, dir: -1 },
        ],
        hazards: [
          { x: 910, y: GROUND_Y - 10, w: 66, h: 10, phase: 0.2 },
          { x: 1406, y: GROUND_Y - 10, w: 66, h: 10, phase: 1.1 },
          { x: 2525, y: GROUND_Y - 10, w: 66, h: 10, phase: 0.65 },
          { x: 3155, y: GROUND_Y - 10, w: 66, h: 10, phase: 1.5 },
        ],
      },
      {
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
          { kind: "plant", x: 570, y: GROUND_Y - 46, w: 42, h: 44, min: 500, max: 760, speed: 38, dir: 1 },
          { kind: "plant", x: 1170, y: GROUND_Y - 46, w: 42, h: 44, min: 1010, max: 1325, speed: 46, dir: -1 },
          { kind: "plant", x: 1810, y: GROUND_Y - 46, w: 42, h: 44, min: 1660, max: 1945, speed: 42, dir: 1 },
          { kind: "plant", x: 2500, y: GROUND_Y - 46, w: 42, h: 44, min: 2320, max: 2680, speed: 52, dir: -1 },
          { kind: "plant", x: 3190, y: GROUND_Y - 46, w: 42, h: 44, min: 3020, max: 3400, speed: 50, dir: 1 },
        ],
        hazards: [
          { kind: "thorn", x: 875, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.2 },
          { kind: "thorn", x: 1450, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.9 },
          { kind: "thorn", x: 2510, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.55 },
          { kind: "thorn", x: 3290, y: GROUND_Y - 12, w: 74, h: 12, phase: 1.3 },
        ],
      },
    ];
  }

  window.GivrosLevels = {
    createLevelTemplates,
  };
})();
