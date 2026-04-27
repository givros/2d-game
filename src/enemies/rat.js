(function () {
  "use strict";

  function createEnemyProfile() {
    return {
      kind: "rat",
      hitbox: { w: 42, h: 22 },
      sourceFaces: "left",
      shadow: { offsetX: 21, offsetY: 25, aliveW: 36, deadW: 26, h: 6, alpha: 0.28 },
      render: {
        generated: "rat",
        aliveW: 70,
        aliveH: 42,
        deadW: 64,
        deadH: 36,
        offsetX: -15,
        offsetY: -20,
        deadOffsetY: -20,
      },
    };
  }

  window.GivrosEnemyRat = {
    createEnemyProfile,
  };
})();
