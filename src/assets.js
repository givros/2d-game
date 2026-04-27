(function () {
  "use strict";

  function createGeneratedAssets(loadGeneratedImage) {
    return {
      background: loadGeneratedImage("assets/generated/paris-promenade-gpt.png"),
      player: loadGeneratedImage("assets/generated/givros-sprites.png"),
      run: loadGeneratedImage("assets/generated/givros-run-cycle.png"),
      atlas: loadGeneratedImage("assets/generated/promenade-atlas.png"),
      finishGate: loadGeneratedImage("assets/generated/montpellier-finish-gate.png"),
      level2Background: loadGeneratedImage("assets/generated/jardin-level2-bg.png"),
      level2Atlas: loadGeneratedImage("assets/generated/jardin-level2-atlas.png"),
      plantMonster: loadGeneratedImage("assets/generated/jardin-monster.png"),
    };
  }

  window.GivrosAssets = {
    createGeneratedAssets,
  };
})();
