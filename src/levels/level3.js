(function () {
  "use strict";

  function createLevel({ GROUND_Y, WORLD_W }) {
    return {
      title: "PARIS FINAL RUN",
      background: "level3",
      atlas: "level1",
      enemyKind: "rat",
      platforms: [
        { x: 0, y: GROUND_Y, w: WORLD_W, h: 86, kind: "ground" },
        { x: 585, y: 304, w: 165, h: 18, kind: "ledge" },
        { x: 1035, y: 286, w: 210, h: 18, kind: "ledge" },
        { x: 1545, y: 315, w: 150, h: 18, kind: "ledge" },
        { x: 2075, y: 298, w: 190, h: 18, kind: "ledge" },
        { x: 2705, y: 292, w: 205, h: 18, kind: "ledge" },
        { x: 3225, y: 310, w: 155, h: 18, kind: "ledge" },
      ],
      props: [],
      coins: [
        [245, 304], [375, 302], [520, 304], [610, 264], [680, 252], [750, 264],
        [965, 302], [1062, 248], [1140, 238], [1222, 248], [1435, 302], [1578, 278],
        [1670, 268], [1925, 302], [2095, 302], [2130, 258], [2210, 246], [2290, 258],
        [2520, 302], [2718, 252], [2810, 238], [2902, 252], [3195, 302], [3265, 270],
      ],
      enemies: [
        { x: 620, min: 525, max: 770, speed: 50, dir: 1 },
        { x: 1160, min: 1005, max: 1315, speed: 58, dir: -1 },
        { x: 1710, min: 1560, max: 1880, speed: 54, dir: 1 },
        { x: 2380, min: 2245, max: 2560, speed: 62, dir: -1 },
        { x: 3005, min: 2860, max: 3195, speed: 58, dir: 1 },
      ],
      hazards: [
        { x: 875, y: GROUND_Y - 10, w: 66, h: 10, phase: 0.25 },
        { x: 1470, y: GROUND_Y - 10, w: 66, h: 10, phase: 0.95 },
        { x: 2015, y: GROUND_Y - 10, w: 66, h: 10, phase: 1.45 },
        { x: 2630, y: GROUND_Y - 10, w: 66, h: 10, phase: 0.55 },
        { x: 3350, y: GROUND_Y - 10, w: 66, h: 10, phase: 1.2 },
      ],
    };
  }

  window.GivrosLevel3 = {
    createLevel,
  };
})();
