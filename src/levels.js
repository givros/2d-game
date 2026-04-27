(function () {
  "use strict";

  function createLevelTemplates(context) {
    return [
      window.GivrosLevel1.createLevel(context),
      window.GivrosLevel2.createLevel(context),
    ];
  }

  window.GivrosLevels = {
    createLevelTemplates,
  };
})();
