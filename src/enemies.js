(function () {
  "use strict";

  function createEnemyProfiles() {
    return {
      rat: window.GivrosEnemyRat.createEnemyProfile(),
      plant: window.GivrosEnemyPlant.createEnemyProfile(),
    };
  }

  window.GivrosEnemies = {
    createEnemyProfiles,
  };
})();
