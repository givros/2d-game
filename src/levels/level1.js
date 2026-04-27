(function () {
  "use strict";

  function createLevel({ GROUND_Y, WORLD_W }) {
    return {
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
    };
  }

  window.GivrosLevel1 = {
    createLevel,
  };
})();
