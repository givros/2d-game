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
        { x: 560, y: 305, w: 150, h: 18, kind: "ledge" },
        { x: 1110, y: 288, w: 190, h: 18, kind: "ledge" },
        { x: 1685, y: 315, w: 150, h: 18, kind: "ledge" },
        { x: 2160, y: 298, w: 180, h: 18, kind: "ledge" },
        { x: 3020, y: 292, w: 175, h: 18, kind: "ledge" },
      ],
      props: [
        ["jardinPergola", 42, GROUND_Y - 132, 170, 132],
        ["jardinLamp", 330, GROUND_Y - 176, 86, 174],
        ["jardinBench", 730, GROUND_Y - 42, 150, 40],
        ["jardinFountain", 1395, GROUND_Y - 120, 146, 118],
        ["jardinCypress", 1975, GROUND_Y - 202, 82, 202],
        ["jardinPalm", 2470, GROUND_Y - 210, 125, 210],
        ["jardinRailing", 2810, GROUND_Y - 112, 190, 108],
        ["jardinPlanter", 3325, GROUND_Y - 65, 112, 63],
      ],
      coins: [
        [238, 304], [356, 302], [510, 304], [606, 265], [666, 253], [708, 265],
        [992, 302], [1104, 250], [1182, 240], [1260, 250], [1484, 302], [1662, 278],
        [1732, 270], [1952, 302], [2162, 302], [2225, 258], [2312, 247], [2394, 258],
        [2608, 302], [2818, 302], [3040, 252], [3115, 238], [3190, 252], [3418, 302],
      ],
      enemies: [
        { x: 570, min: 500, max: 760, speed: 38, dir: 1 },
        { x: 1170, min: 1010, max: 1325, speed: 46, dir: -1 },
        { x: 1810, min: 1660, max: 1945, speed: 42, dir: 1 },
        { x: 2500, min: 2320, max: 2680, speed: 52, dir: -1 },
        { x: 3190, min: 3020, max: 3400, speed: 50, dir: 1 },
      ],
      hazards: [
        { kind: "thorn", x: 910, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.2 },
        { kind: "thorn", x: 1555, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.9 },
        { kind: "thorn", x: 2385, y: GROUND_Y - 12, w: 74, h: 12, phase: 0.55 },
        { kind: "thorn", x: 3210, y: GROUND_Y - 12, w: 74, h: 12, phase: 1.3 },
      ],
    };
  }

  window.GivrosLevel2 = {
    createLevel,
  };
})();
