(function () {
  "use strict";

  function createEnemyProfile() {
    return {
      kind: "plant",
      hitbox: { w: 42, h: 44 },
      sourceFaces: "right",
      shadow: { offsetX: 21, offsetY: 47, aliveW: 42, deadW: 34, h: 6, alpha: 0.28 },
      render: {
        generated: "plant",
        aliveW: 78,
        aliveH: 78,
        deadW: 72,
        deadH: 58,
        offsetX: -18,
        offsetY: -31,
        deadOffsetY: -8,
      },
    };
  }

  window.GivrosEnemyPlant = {
    createEnemyProfile,
  };
})();
