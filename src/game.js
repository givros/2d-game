(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const gameShell = document.getElementById("game-shell");
  const portraitCanvas = document.getElementById("portrait");
  const portraitCtx = portraitCanvas.getContext("2d");

  const heartHost = document.getElementById("hearts");
  const energyBar = document.getElementById("energy-bar");
  const coinCount = document.getElementById("coin-count");
  const timeLeft = document.getElementById("time-left");
  const scoreValue = document.getElementById("score-value");
  const mapMarker = document.getElementById("map-marker");
  const statusBanner = document.getElementById("status-banner");
  const statusTitle = document.getElementById("status-title");
  const statusSubtitle = document.getElementById("status-subtitle");
  const restartButton = document.getElementById("restart-button");
  const nextLevelButton = document.getElementById("next-level-button");

  const VIEW_W = 768;
  const VIEW_H = 432;
  const WORLD_W = 3850;
  const GROUND_Y = 346;
  const FINISH_X = WORLD_W - 310;
  const MAX_HEALTH = 8;
  const START_TIME = 0;
  const GRAVITY = 1500;
  const MOVE_SPEED = 190;
  const JUMP_SPEED = -560;
  const RUN_FRAME_SEQUENCE = [0, 2, 4, 6];

  ctx.imageSmoothingEnabled = false;
  portraitCtx.imageSmoothingEnabled = false;

  const keys = new Set();
  const pressed = new Set();
  const touch = {
    left: false,
    right: false,
    jump: false,
  };

  const palettes = {
    skyTop: "#126fbc",
    skyMid: "#28a4db",
    skyLow: "#86c7df",
    haze: "#d9f2e6",
    stone: "#c0925f",
    stoneLight: "#e5c083",
    stoneGold: "#f0d599",
    stoneDark: "#674126",
    brick: "#8d633c",
    brickLight: "#b9824e",
    brickDark: "#3c281e",
    mortar: "#211610",
    leaf: "#2f8c33",
    leafLight: "#5ab342",
    leafDark: "#1f5f2a",
    water: "#5fb7d5",
    outline: "#120c0a",
  };

  function makePlayer() {
    return {
      x: 148,
      y: GROUND_Y - 48,
      w: 25,
      h: 48,
      vx: 0,
      vy: 0,
      previousY: GROUND_Y - 48,
      onGround: false,
      facing: 1,
      health: MAX_HEALTH,
      energy: 100,
      invulnerable: 0,
      attack: 0,
      attackCooldown: 0,
      coins: 0,
      score: 0,
      checkpointX: 148,
      step: 0,
    };
  }

  const levelTemplates = window.GivrosLevels.createLevelTemplates({ GROUND_Y, WORLD_W });

  let activeLevelIndex = 0;

  function currentLevelTemplate() {
    return levelTemplates[activeLevelIndex] || levelTemplates[0];
  }

  function coinTotal() {
    return currentLevelTemplate().coins.length;
  }

  function cloneLevel() {
    const template = currentLevelTemplate();
    return {
      platforms: template.platforms.map((platform) => ({ ...platform })),
      coins: template.coins.map(([x, y], index) => ({
        id: index,
        x,
        y,
        r: 9,
        taken: false,
        bob: index * 0.37,
      })),
      enemies: template.enemies.map((enemy, index) => ({
        id: index,
        kind: enemy.kind || template.enemyKind,
        x: enemy.x,
        y: enemy.y,
        w: enemy.w || 42,
        h: enemy.h || 22,
        min: enemy.min,
        max: enemy.max,
        speed: enemy.speed,
        dir: enemy.dir,
        alive: true,
        defeatTime: 0,
      })),
      hazards: template.hazards.map((hazard) => ({ ...hazard })),
    };
  }

  const state = {
    player: makePlayer(),
    level: cloneLevel(),
    cameraX: 0,
    time: START_TIME,
    elapsed: 0,
    flash: 0,
    shake: 0,
    mode: "ready",
    countdown: 0,
    lastFrame: performance.now(),
  };

  const sprites = buildSprites();
  const generatedAssets = window.GivrosAssets.createGeneratedAssets(loadGeneratedImage);
  window.__GIVROS_BUILD = "gpt-assets-20260427-12";
  fitGameShell();
  showStartScreen();
  drawPortrait();
  createHearts();
  updateHud();

  window.addEventListener("keydown", (event) => {
    const code = event.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(code)) {
      event.preventDefault();
    }
    if (!keys.has(code)) {
      pressed.add(code);
    }
    keys.add(code);

    if (code === "Enter") {
      if (state.mode === "ready") {
        startCountdown();
      } else if (state.mode !== "running" && state.mode !== "countdown") {
        resetGame(true);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  document.querySelectorAll(".touch-button").forEach((button) => {
    const control = button.dataset.control;
    const activate = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      if (!touch[control]) {
        pressed.add("Touch" + control);
      }
      touch[control] = true;
      button.classList.add("is-pressed");
    };
    const release = (event) => {
      event.preventDefault();
      if (button.hasPointerCapture?.(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
      touch[control] = false;
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  window.addEventListener("blur", releaseTouchControls);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseTouchControls();
    }
  });

  restartButton.addEventListener("click", () => {
    if (state.mode === "ready") {
      startCountdown();
      return;
    }
    resetGame(true);
  });
  nextLevelButton.addEventListener("click", () => {
    activeLevelIndex = Math.min(activeLevelIndex + 1, levelTemplates.length - 1);
    resetGame(true);
  });
  window.addEventListener("resize", queueFitGameShell);
  window.addEventListener("orientationchange", queueFitGameShell);
  window.visualViewport?.addEventListener("resize", queueFitGameShell);
  window.visualViewport?.addEventListener("scroll", queueFitGameShell);

  requestAnimationFrame(loop);

  function fitGameShell() {
    if (window.matchMedia("(pointer: coarse)").matches) {
      const viewportW = Math.max(1, Math.round(document.documentElement.clientWidth || window.innerWidth));
      const viewportH = Math.max(1, Math.round(document.documentElement.clientHeight || window.innerHeight));
      gameShell.style.position = "fixed";
      gameShell.style.left = "0px";
      gameShell.style.top = "0px";
      gameShell.style.width = viewportW + "px";
      gameShell.style.height = viewportH + "px";
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    gameShell.style.position = "";
    gameShell.style.left = "";
    gameShell.style.top = "";
    const viewportW = Math.max(1, Math.round(window.innerWidth));
    const viewportH = Math.max(1, Math.round(window.innerHeight));
    const borderBudget = 8;
    const availableW = Math.max(1, viewportW - borderBudget);
    const availableH = Math.max(1, viewportH - borderBudget);
    const fittedScale = Math.min(availableW / VIEW_W, availableH / VIEW_H);
    const integerScale = Math.floor(fittedScale);
    const scale = integerScale >= 1 ? integerScale : fittedScale;
    gameShell.style.width = Math.max(1, Math.round(VIEW_W * scale)) + "px";
    gameShell.style.height = Math.max(1, Math.round(VIEW_H * scale)) + "px";
  }

  function queueFitGameShell() {
    fitGameShell();
    requestAnimationFrame(fitGameShell);
    window.setTimeout(fitGameShell, 120);
    window.setTimeout(fitGameShell, 320);
  }

  function releaseTouchControls() {
    for (const control of Object.keys(touch)) {
      touch[control] = false;
    }
    document.querySelectorAll(".touch-button.is-pressed").forEach((button) => {
      button.classList.remove("is-pressed");
    });
  }

  function resetGame(showStart) {
    state.player = makePlayer();
    state.level = cloneLevel();
    state.cameraX = 0;
    state.time = START_TIME;
    state.elapsed = 0;
    state.flash = 0;
    state.shake = 0;
    state.mode = showStart ? "ready" : "running";
    state.countdown = 0;
    state.lastFrame = performance.now();
    createHearts();
    updateHud();
    nextLevelButton.classList.add("hidden");
    if (showStart) {
      showStartScreen();
    } else {
      statusBanner.classList.add("hidden");
    }
  }

  function loop(now) {
    const dt = Math.max(0, Math.min((now - state.lastFrame) / 1000, 0.033));
    state.lastFrame = now;

    if (state.mode === "running") {
      update(dt);
    } else if (state.mode === "countdown") {
      updateCountdown(dt);
    } else {
      state.elapsed += dt;
    }

    draw();
    pressed.clear();
    requestAnimationFrame(loop);
  }

  function startCountdown() {
    state.mode = "countdown";
    state.countdown = 3;
    state.lastFrame = performance.now();
    restartButton.classList.add("hidden");
    statusBanner.classList.remove("hidden");
    statusTitle.textContent = "GET READY";
    statusSubtitle.textContent = "3";
  }

  function updateCountdown(dt) {
    state.elapsed += dt;
    state.countdown = Math.max(0, state.countdown - dt);
    const count = Math.ceil(state.countdown);
    statusSubtitle.textContent = count > 0 ? String(count) : "GO!";
    if (state.countdown <= 0) {
      state.mode = "running";
      state.lastFrame = performance.now();
      statusBanner.classList.add("hidden");
      restartButton.classList.remove("hidden");
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.time += dt;
    state.flash = Math.max(0, state.flash - dt);
    state.shake = Math.max(0, state.shake - dt);

    const player = state.player;
    player.previousY = player.y;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.attack = Math.max(0, player.attack - dt);
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.energy = Math.min(100, player.energy + dt * (player.onGround ? 22 : 14));

    const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA") || touch.left;
    const movingRight = keys.has("ArrowRight") || keys.has("KeyD") || touch.right;
    const wantsJump = pressed.has("ArrowUp") || pressed.has("KeyW") || pressed.has("Space") || pressed.has("Touchjump");
    const wantsAttack = pressed.has("KeyJ") || pressed.has("KeyK") || pressed.has("KeyX");

    let direction = 0;
    if (movingLeft) direction -= 1;
    if (movingRight) direction += 1;

    if (direction !== 0) {
      player.facing = direction;
      player.vx = approach(player.vx, direction * MOVE_SPEED, 1200 * dt);
      player.step += dt * Math.abs(player.vx) * 0.052;
    } else {
      player.vx = approach(player.vx, 0, 1700 * dt);
    }

    if (wantsJump && player.onGround) {
      player.vy = JUMP_SPEED;
      player.onGround = false;
      player.energy = Math.max(0, player.energy - 6);
    }

    if (wantsAttack && player.attackCooldown <= 0 && player.energy >= 16) {
      player.attack = 0.22;
      player.attackCooldown = 0.38;
      player.energy -= 16;
    }

    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.x = clamp(player.x, 14, WORLD_W - player.w - 24);
    player.y += player.vy * dt;
    resolvePlatforms(player);

    if (player.y > VIEW_H + 120) {
      hurtPlayer(1, player.x, true);
    }

    updateEnemies(dt);
    updateCollectibles();
    updateHazards();
    updateEnemyCollisions();
    updateCamera();

    if (player.x > FINISH_X + 104 && player.coins >= coinTotal()) {
      endRun(true);
    }

    updateHud();
  }

  function resolvePlatforms(player) {
    player.onGround = false;
    for (const platform of state.level.platforms) {
      if (player.vy < 0) {
        continue;
      }
      const wasAbove = player.previousY + player.h <= platform.y + 5;
      const overlapsX = player.x + player.w > platform.x + 3 && player.x < platform.x + platform.w - 3;
      const landed = player.y + player.h >= platform.y && player.y + player.h <= platform.y + 42;
      if (wasAbove && overlapsX && landed) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  function updateEnemies(dt) {
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) {
        enemy.defeatTime += dt;
        continue;
      }
      enemy.x += enemy.dir * enemy.speed * dt;
      if (enemy.x < enemy.min) {
        enemy.x = enemy.min;
        enemy.dir = 1;
      }
      if (enemy.x > enemy.max) {
        enemy.x = enemy.max;
        enemy.dir = -1;
      }
    }
  }

  function updateCollectibles() {
    const playerBox = getPlayerBox();
    for (const coin of state.level.coins) {
      if (coin.taken) {
        continue;
      }
      const coinBox = {
        x: coin.x - coin.r,
        y: coin.y - coin.r + Math.sin(state.elapsed * 4 + coin.bob) * 3,
        w: coin.r * 2,
        h: coin.r * 2,
      };
      if (overlaps(playerBox, coinBox)) {
        coin.taken = true;
        state.player.coins += 1;
        state.player.score += 250;
      }
    }
  }

  function updateHazards() {
    const playerBox = getPlayerBox();
    for (const hazard of state.level.hazards) {
      const active = isHazardActive(hazard);
      const hazardBox = { x: hazard.x, y: hazard.y - (active ? 24 : 0), w: hazard.w, h: active ? 34 : 10 };
      if (active && overlaps(playerBox, hazardBox)) {
        hurtPlayer(1, hazard.x + hazard.w / 2, false);
      }
    }
  }

  function updateEnemyCollisions() {
    const player = state.player;
    const playerBox = getPlayerBox();
    const attackBox = getAttackBox();

    for (const enemy of state.level.enemies) {
      if (!enemy.alive) {
        continue;
      }

      const enemyBox = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (attackBox && overlaps(attackBox, enemyBox)) {
        defeatEnemy(enemy, 350);
        continue;
      }

      if (!overlaps(playerBox, enemyBox)) {
        continue;
      }

      const previousBottom = player.previousY + player.h;
      const stomped = player.vy > 90 && previousBottom <= enemy.y + 8;
      if (stomped) {
        defeatEnemy(enemy, 500);
        player.vy = -360;
      } else {
        hurtPlayer(1, enemy.x + enemy.w / 2, false);
      }
    }
  }

  function defeatEnemy(enemy, score) {
    enemy.alive = false;
    enemy.defeatTime = 0;
    state.player.score += score;
    state.player.energy = Math.min(100, state.player.energy + 12);
    state.shake = 0.08;
  }

  function hurtPlayer(amount, sourceX, respawn) {
    const player = state.player;
    if (player.invulnerable > 0) {
      return;
    }
    player.health -= amount;
    state.time += amount;
    player.invulnerable = 1.05;
    player.vx = player.x < sourceX ? -235 : 235;
    player.vy = -260;
    state.shake = 0.16;

    if (respawn) {
      player.x = player.checkpointX;
      player.y = GROUND_Y - player.h;
      player.vx = 0;
      player.vy = 0;
    }

    if (player.health <= 0) {
      endRun(false);
    }
  }

  function endRun(won) {
    if (state.mode !== "running") {
      return;
    }
    state.mode = won ? "clear" : "gameover";
    if (won) {
      statusTitle.textContent = "STAGE CLEAR";
    } else {
      statusTitle.textContent = "GAME OVER";
    }
    updateHud();
    statusSubtitle.innerHTML = makeResultMarkup(won);
    nextLevelButton.classList.toggle("hidden", !won || activeLevelIndex >= levelTemplates.length - 1);
    restartButton.textContent = "RESTART";
    restartButton.classList.remove("hidden");
    statusBanner.classList.remove("hidden");
  }

  function showStartScreen() {
    const template = currentLevelTemplate();
    statusTitle.textContent = template.title;
    statusSubtitle.innerHTML = `
      <div class="start-rules">
        <p>Speedrun challenge: finish as fast as possible.</p>
        <p>Collect every coin. The gate appears only at ${coinTotal()}/${coinTotal()}.</p>
        <p>Damage penalty: +1s.</p>
        <p>Move: Arrows / A D</p>
        <p>Jump: Space / W / Up</p>
      </div>
    `;
    nextLevelButton.classList.add("hidden");
    restartButton.textContent = "START";
    restartButton.classList.remove("hidden");
    statusBanner.classList.remove("hidden");
  }

  function makeResultMarkup(won) {
    return `
      <div class="result-table">
        <div><span>TIME</span><strong>${formatTime(state.time)}</strong></div>
        <div><span>SCORE</span><strong>${padScore(state.player.score, 7)}</strong></div>
      </div>
    `;
  }

  function updateCamera() {
    const target = state.player.x - 210;
    state.cameraX = clamp(lerp(state.cameraX, target, 0.09), 0, WORLD_W - VIEW_W);
  }

  function updateHud() {
    const player = state.player;
    for (let i = 0; i < heartHost.children.length; i += 1) {
      heartHost.children[i].classList.toggle("empty", i >= player.health);
    }
    energyBar.style.width = clamp(player.energy, 0, 100).toFixed(0) + "%";
    coinCount.textContent = "x" + String(player.coins).padStart(2, "0") + "/" + String(coinTotal()).padStart(2, "0");
    timeLeft.textContent = formatTime(state.time);
    scoreValue.textContent = padScore(player.score, 7);

    const markerMax = 103;
    const markerX = 10 + (player.x / WORLD_W) * markerMax;
    mapMarker.style.left = markerX.toFixed(1) + "px";
  }

  function createHearts() {
    heartHost.replaceChildren();
    for (let i = 0; i < MAX_HEALTH; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart";
      heartHost.appendChild(heart);
    }
  }

  function draw() {
    const shakeX = state.shake > 0 ? Math.round((Math.random() - 0.5) * 5) : 0;
    const shakeY = state.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    const cameraX = Math.round(state.cameraX) + shakeX;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const generatedScene = drawGeneratedBackdrop(cameraX);
    if (generatedScene) {
      drawGeneratedGameplaySurfaces(cameraX);
    } else {
      drawSky(cameraX);
      drawDistantParis(cameraX);
      drawLandmarks(cameraX);
      drawGround(cameraX);
    }
    drawHazards(cameraX, generatedScene);
    drawCoins(cameraX, generatedScene);
    drawEnemies(cameraX, generatedScene);
    drawPlayer(cameraX, shakeY);
    if (!generatedScene) {
      drawPixelAtmosphere(cameraX);
      drawForeground(cameraX);
    }

    if (!generatedScene) {
      drawPixelVignette();
    }
  }

  function drawGeneratedBackdrop(cameraX) {
    const asset = currentLevelTemplate().background === "level2" ? generatedAssets.level2Background : generatedAssets.background;
    if (!isDrawableImage(asset.image)) {
      return false;
    }

    const strip = getPixelBackdrop(asset);
    if (!strip) {
      return false;
    }

    const maxSourceX = Math.max(0, strip.width - VIEW_W);
    const progress = cameraX / Math.max(1, WORLD_W - VIEW_W);
    const sourceX = Math.round(clamp(progress * maxSourceX, 0, maxSourceX));

    if (!safeDrawImage(strip, sourceX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H)) {
      return false;
    }
    return true;
  }

  function getPixelBackdrop(asset) {
    if (asset.pixelStrip) {
      return asset.pixelStrip;
    }
    const image = asset.image;
    if (!isDrawableImage(image)) {
      return null;
    }

    const scaledW = Math.max(VIEW_W, Math.round((image.width / image.height) * VIEW_H));
    const strip = document.createElement("canvas");
    strip.width = scaledW;
    strip.height = VIEW_H;
    const stripCtx = strip.getContext("2d", { alpha: false });
    stripCtx.imageSmoothingEnabled = false;
    stripCtx.drawImage(image, 0, 0, image.width, image.height, 0, 0, scaledW, VIEW_H);
    asset.pixelStrip = strip;
    return strip;
  }

  function drawGeneratedGameplaySurfaces(cameraX) {
    drawGeneratedForegroundProps(cameraX);
    if (state.player.coins >= coinTotal()) {
      drawFinishGate(FINISH_X - cameraX, GROUND_Y - 183);
    }

    for (const platform of state.level.platforms) {
      if (platform.kind === "ledge") {
        drawGeneratedLedge(platform.x - cameraX, platform.y, platform.w, platform.h);
      }
    }
  }

  function drawGeneratedForegroundProps(cameraX) {
    const props = activeLevelIndex === 1 ? [
      ["jardinPergola", 42, GROUND_Y - 132, 170, 132],
      ["jardinLamp", 330, GROUND_Y - 176, 86, 174],
      ["jardinBench", 730, GROUND_Y - 42, 150, 40],
      ["jardinFountain", 1395, GROUND_Y - 120, 146, 118],
      ["jardinCypress", 1975, GROUND_Y - 202, 82, 202],
      ["jardinPalm", 2470, GROUND_Y - 210, 125, 210],
      ["jardinRailing", 2810, GROUND_Y - 112, 190, 108],
      ["jardinPlanter", 3270, GROUND_Y - 65, 112, 63],
    ] : [
      ["banner", 58, GROUND_Y - 168, 130, 166],
      ["planter", 52, GROUND_Y - 58, 104, 54],
      ["planter", 192, GROUND_Y - 58, 104, 54],
      ["trash", 2218, GROUND_Y - 78, 45, 76],
      ["railing", 2288, GROUND_Y - 84, 210, 80],
      ["planter", 2628, GROUND_Y - 58, 104, 54],
      ["bollard", 2798, GROUND_Y - 52, 34, 52],
      ["bollard", 2862, GROUND_Y - 52, 34, 52],
      ["bollard", 2926, GROUND_Y - 52, 34, 52],
      ["banner", 3446, GROUND_Y - 168, 130, 166],
    ];

    for (const [name, worldX, y, w, h] of props) {
      const x = Math.round(worldX - cameraX);
      if (x > VIEW_W + 120 || x + w < -120) {
        continue;
      }
      drawAtlasProp(name, x, y, w, h);
    }
  }

  function drawAtlasProp(name, x, y, w, h) {
    const asset = currentLevelTemplate().atlas === "level2" ? generatedAssets.level2Atlas : generatedAssets.atlas;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    const frames = activeLevelIndex === 1 ? {
      jardinPergola: [760, 350, 210, 250],
      jardinLamp: [1280, 642, 210, 300],
      jardinBench: [1030, 755, 270, 95],
      jardinFountain: [780, 575, 280, 220],
      jardinCypress: [1118, 150, 140, 430],
      jardinPalm: [1260, 160, 250, 430],
      jardinRailing: [750, 170, 285, 135],
      jardinPlanter: [290, 648, 240, 100],
    } : {
      banner: [36, 458, 256, 300],
      lamp: [330, 448, 260, 300],
      trash: [620, 474, 165, 268],
      planter: [805, 520, 360, 220],
      railing: [1180, 510, 334, 230],
      bollard: [1365, 765, 126, 220],
    };
    const frame = frames[name];
    if (!frame) {
      return false;
    }
    return drawGeneratedFrame(asset.image, frame[0], frame[1], frame[2], frame[3], x, y, w, h, false);
  }

  function drawGeneratedLedge(x, y, w, h) {
    const asset = currentLevelTemplate().atlas === "level2" ? generatedAssets.level2Atlas : generatedAssets.atlas;
    const sx = Math.round(x);
    if (isDrawableImage(asset.image)) {
      drawAtlasPlatform(sx, y, w);
    }
  }

  function drawAtlasPlatform(x, y, w) {
    const asset = currentLevelTemplate().atlas === "level2" ? generatedAssets.level2Atlas : generatedAssets.atlas;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    const source = activeLevelIndex === 1 ? [40, 40, 270, 115] : [30, 760, 420, 150];
    const tileW = 70;
    const tileH = 28;
    for (let dx = 0; dx < w; dx += tileW) {
      const dw = Math.min(tileW, w - dx);
      drawGeneratedFrame(
        asset.image,
        source[0],
        source[1],
        source[2],
        source[3],
        x + dx,
        y - 8,
        dw,
        tileH,
        false,
      );
    }
    return true;
  }

  function drawSky(cameraX) {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 286);
    skyGradient.addColorStop(0, palettes.skyTop);
    skyGradient.addColorStop(0.48, palettes.skyMid);
    skyGradient.addColorStop(1, palettes.skyLow);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, VIEW_W, 286);
    ctx.fillStyle = "#6fb4d3";
    ctx.fillRect(0, 286, VIEW_W, VIEW_H - 286);

    ctx.fillStyle = "rgba(255, 236, 165, 0.12)";
    for (let ring = 0; ring < 6; ring += 1) {
      const size = 26 + ring * 28;
      ctx.fillRect(578 - size / 2, 35 + ring * 2, size, 5);
      ctx.fillRect(578 - size / 3, 47 + ring * 5, size * 0.66, 4);
    }

    drawCloud(122 - cameraX * 0.12, 142, 1.15);
    drawCloud(330 - cameraX * 0.09, 82, 1.35);
    drawCloud(646 - cameraX * 0.1, 112, 1.0);
    drawCloud(980 - cameraX * 0.12, 76, 1.3);
    drawCloud(1320 - cameraX * 0.1, 134, 0.95);
    drawCloud(1770 - cameraX * 0.1, 92, 1.45);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 74; i += 1) {
      const x = wrap(i * 83 - cameraX * 0.04, -20, VIEW_W + 20);
      const y = 28 + ((i * 47) % 170);
      const size = i % 5 === 0 ? 3 : 2;
      ctx.fillRect(Math.round(x), y, size, size);
    }

    for (let i = 0; i < 56; i += 1) {
      const x = wrap(i * 59 - cameraX * 0.08, -24, VIEW_W + 24);
      const y = 186 + ((i * 31) % 82);
      ctx.fillStyle = i % 2 ? "rgba(230,248,235,0.13)" : "rgba(38,119,159,0.12)";
      ctx.fillRect(Math.round(x), y, 4, 2);
    }
  }

  function drawCloud(x, y, scale) {
    const sx = Math.round(wrap(x, -220, VIEW_W + 220));
    const blocks = [
      [0, 16, 44, 13], [18, 5, 45, 20], [52, 0, 56, 27], [96, 10, 54, 18],
      [136, 20, 38, 11], [34, 26, 112, 12],
    ];
    ctx.fillStyle = "rgba(134, 177, 183, 0.24)";
    for (const block of blocks) {
      ctx.fillRect(
        Math.round(sx + block[0] * scale + 5),
        Math.round(y + block[1] * scale + 11),
        Math.round(block[2] * scale),
        Math.round(block[3] * scale),
      );
    }
    ctx.fillStyle = "rgba(255, 248, 214, 0.76)";
    for (const block of blocks) {
      ctx.fillRect(
        Math.round(sx + block[0] * scale),
        Math.round(y + block[1] * scale),
        Math.round(block[2] * scale),
        Math.round(block[3] * scale),
      );
    }
    ctx.fillStyle = "rgba(255, 255, 242, 0.52)";
    ctx.fillRect(Math.round(sx + 22 * scale), Math.round(y + 10 * scale), Math.round(42 * scale), Math.round(5 * scale));
    ctx.fillRect(Math.round(sx + 72 * scale), Math.round(y + 9 * scale), Math.round(32 * scale), Math.round(5 * scale));
    ctx.fillStyle = "rgba(155, 193, 194, 0.36)";
    ctx.fillRect(Math.round(sx + 16 * scale), Math.round(y + 33 * scale), Math.round(120 * scale), Math.round(7 * scale));
    ctx.fillStyle = "rgba(255,255,255,0.26)";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(Math.round(sx + (26 + i * 19) * scale), Math.round(y + (22 + (i % 2) * 7) * scale), Math.max(2, Math.round(5 * scale)), Math.max(1, Math.round(2 * scale)));
    }
  }

  function drawDistantParis(cameraX) {
    const baseX = -cameraX * 0.35;

    drawRiverBand(cameraX);
    drawBuildingRow(baseX - 80, 245, 12);
    drawInvalidesDome(baseX + 525, 99);
    drawBuildingRow(baseX + 780, 246, 16);
    drawFountain(baseX + 922, 249);
    drawStatueLine(baseX + 350, 261);

    for (let i = 0; i < 16; i += 1) {
      drawTree(baseX + i * 220 - 130, 246 + (i % 3) * 6, 0.74);
    }
  }

  function drawRiverBand(cameraX) {
    ctx.fillStyle = palettes.water;
    ctx.fillRect(0, 282, VIEW_W, 68);
    ctx.fillStyle = "rgba(255, 238, 174, 0.22)";
    for (let i = 0; i < 44; i += 1) {
      const x = wrap(i * 63 - cameraX * 0.21, -36, VIEW_W + 36);
      const y = 294 + ((i * 19) % 46);
      ctx.fillRect(Math.round(x), y, 30 + (i % 3) * 12, 3);
    }
    ctx.fillStyle = "rgba(32, 105, 138, 0.22)";
    for (let i = 0; i < 38; i += 1) {
      const x = wrap(i * 71 - cameraX * 0.29, -40, VIEW_W + 40);
      const y = 308 + ((i * 17) % 36);
      ctx.fillRect(Math.round(x), y, 24, 2);
    }
  }

  function drawBuildingRow(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const bx = Math.round(x + i * 58);
      const h = 34 + ((i * 13) % 18);
      ctx.fillStyle = i % 2 ? "#b98b62" : "#caa274";
      ctx.fillRect(bx, y - h, 58, h);
      ctx.fillStyle = i % 2 ? "#e0ba82" : "#d9b486";
      ctx.fillRect(bx + 4, y - h + 5, 48, 3);
      ctx.fillStyle = "#6d523f";
      ctx.fillRect(bx, y - h - 6, 58, 6);
      ctx.fillStyle = "#f0d6a4";
      ctx.fillRect(bx + 3, y - h - 6, 50, 2);
      ctx.fillStyle = "#815d3e";
      ctx.fillRect(bx + 9, y - h - 15, 8, 15);
      ctx.fillRect(bx + 38, y - h - 12, 7, 12);
      ctx.fillStyle = "#213b4d";
      for (let w = 0; w < 3; w += 1) {
        ctx.fillRect(bx + 11 + w * 15, y - h + 9, 7, 12);
        ctx.fillStyle = "#f8d789";
        if ((i + w) % 4 === 0) {
          ctx.fillRect(bx + 13 + w * 15, y - h + 12, 3, 3);
        }
        ctx.fillStyle = "#213b4d";
      }
      ctx.fillStyle = "rgba(63, 45, 33, 0.32)";
      ctx.fillRect(bx, y - 3, 58, 3);
    }
  }

  function drawStatueLine(x, y) {
    for (let i = 0; i < 6; i += 1) {
      const sx = Math.round(x + i * 78);
      ctx.fillStyle = "#6a543f";
      ctx.fillRect(sx, y + 28, 38, 7);
      ctx.fillStyle = "#3f3128";
      ctx.fillRect(sx + 14, y + 8, 9, 22);
      ctx.fillRect(sx + 7, y + 18, 23, 5);
      ctx.fillStyle = "#947257";
      ctx.fillRect(sx + 11, y + 4, 15, 7);
    }
  }

  function drawInvalidesDome(x, y) {
    const sx = Math.round(x);
    ctx.fillStyle = "#9f7858";
    ctx.fillRect(sx - 52, y + 126, 136, 45);
    ctx.fillStyle = "#d7b17a";
    ctx.fillRect(sx - 38, y + 86, 108, 84);
    ctx.fillStyle = "#f3d895";
    ctx.fillRect(sx - 29, y + 92, 89, 5);
    ctx.fillRect(sx - 31, y + 146, 93, 4);
    ctx.fillStyle = "#2f4c64";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(sx - 25 + i * 17, y + 99, 7, 45);
      ctx.fillStyle = "#8096a5";
      ctx.fillRect(sx - 23 + i * 17, y + 103, 2, 37);
      ctx.fillStyle = "#2f4c64";
    }
    ctx.fillStyle = "#27394e";
    ctx.fillRect(sx + 11, y + 12, 12, 31);
    ctx.fillRect(sx + 16, y - 28, 4, 42);
    ctx.fillStyle = "#d8bd83";
    ctx.beginPath();
    ctx.moveTo(sx - 39, y + 91);
    ctx.quadraticCurveTo(sx + 16, y + 25, sx + 70, y + 91);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#253a4e";
    for (let i = 0; i < 8; i += 1) {
      ctx.fillRect(sx - 30 + i * 13, y + 76 - Math.abs(3 - i) * 5, 5, 28 + Math.abs(3 - i) * 5);
    }
    ctx.fillStyle = "#f4db9a";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(sx - 20 + i * 13, y + 60 - Math.abs(3 - i) * 4, 5, 3);
    }
    ctx.fillStyle = "#f0d194";
    ctx.fillRect(sx - 10, y + 43, 53, 7);
    ctx.fillRect(sx - 45, y + 154, 150, 10);
    ctx.fillStyle = "#5a3c2a";
    ctx.fillRect(sx - 56, y + 170, 154, 5);
    drawStoneFlecks(sx - 39, y + 98, 104, 64, 18, 0.55);
  }

  function drawFountain(x, y) {
    const sx = Math.round(x);
    ctx.fillStyle = "#6f533e";
    ctx.fillRect(sx - 44, y + 62, 88, 8);
    ctx.fillRect(sx - 30, y + 46, 60, 11);
    ctx.fillStyle = "#3f2e24";
    ctx.fillRect(sx - 9, y + 8, 18, 46);
    ctx.fillRect(sx - 26, y + 26, 52, 7);
    ctx.fillStyle = "#4db7da";
    for (let i = -3; i <= 3; i += 1) {
      ctx.fillRect(sx + i * 7, y + 20 + Math.abs(i) * 7, 3, 34 - Math.abs(i) * 4);
    }
    ctx.fillStyle = "rgba(188,235,255,0.55)";
    ctx.fillRect(sx - 40, y + 57, 80, 5);
    ctx.fillStyle = "rgba(242,255,255,0.75)";
    for (let i = 0; i < 12; i += 1) {
      const px = sx - 39 + ((i * 17) % 78);
      const py = y + 46 + ((i * 11) % 22);
      ctx.fillRect(px, py, 3, 3);
    }
  }

  function drawLandmarks(cameraX) {
    drawLampPost(110 - cameraX, 161);
    drawPlanter(38 - cameraX, 302);
    drawPlanter(169 - cameraX, 302);
    drawStreetPlaque(18 - cameraX, GROUND_Y - 46, "MONTPELLIER");
    drawTree(353 - cameraX * 0.75, 250, 0.95);
    drawTree(2042 - cameraX, 248, 1.05);
    drawBench(1856 - cameraX, GROUND_Y - 50);
    drawArch(2520 - cameraX, 112);
    drawTrashCan(2240 - cameraX, GROUND_Y - 80);
    drawRailing(2290 - cameraX, GROUND_Y - 95);
    drawPlanter(2632 - cameraX, 304);
    drawBollards(2810 - cameraX, GROUND_Y - 39, 6);
    drawTree(3185 - cameraX, 238, 1.15);
    drawLampPost(3460 - cameraX, 164);
  }

  function drawLampPost(x, y) {
    const sx = Math.round(x);
    ctx.fillStyle = "#171b1f";
    ctx.fillRect(sx + 43, y + 0, 8, 186);
    ctx.fillStyle = "#3d4850";
    ctx.fillRect(sx + 45, y + 8, 2, 164);
    ctx.fillStyle = "#171b1f";
    ctx.fillRect(sx + 36, y + 176, 22, 8);
    ctx.fillRect(sx + 31, y + 184, 32, 7);
    ctx.fillRect(sx + 18, y + 45, 58, 6);
    ctx.fillRect(sx + 7, y + 49, 13, 5);
    ctx.fillRect(sx + 74, y + 49, 13, 5);
    ctx.fillRect(sx + 39, y - 10, 16, 15);
    ctx.fillRect(sx + 43, y - 27, 8, 19);
    ctx.fillRect(sx + 41, y - 40, 12, 12);
    ctx.fillStyle = "#dfeaf0";
    ctx.fillRect(sx + 43, y - 37, 8, 8);
    ctx.fillStyle = "rgba(255, 230, 130, 0.14)";
    ctx.fillRect(sx + 24, y - 24, 46, 44);
    drawBanner(sx - 1, y + 59);
    drawBanner(sx + 64, y + 59);
  }

  function drawBanner(x, y) {
    ctx.fillStyle = "#0d4a86";
    ctx.fillRect(x, y, 42, 83);
    ctx.fillStyle = "#1d79b4";
    ctx.fillRect(x + 3, y + 4, 36, 76);
    ctx.fillStyle = "#2e9bd0";
    ctx.fillRect(x + 6, y + 7, 5, 70);
    ctx.fillStyle = "#082b55";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(x + 4, y + 8 + i * 10, 3, 3);
      ctx.fillRect(x + 35, y + 8 + i * 10, 3, 3);
    }
    ctx.fillStyle = "#f0f4e9";
    ctx.font = "bold 10px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("MONT", x + 21, y + 18);
    ctx.fillText("PELL", x + 21, y + 36);
    ctx.fillText("IER", x + 21, y + 54);
    ctx.fillText("M", x + 21, y + 75);
  }

  function drawPlanter(x, y) {
    const sx = Math.round(x);
    ctx.fillStyle = "#71451f";
    ctx.fillRect(sx, y + 15, 56, 14);
    ctx.fillStyle = "#a86825";
    ctx.fillRect(sx + 4, y + 28, 48, 16);
    ctx.fillStyle = palettes.leafDark;
    ctx.fillRect(sx + 9, y, 38, 20);
    ctx.fillStyle = palettes.leaf;
    for (let i = 0; i < 12; i += 1) {
      ctx.fillRect(sx + 6 + ((i * 11) % 44), y + ((i * 7) % 17), 8, 8);
    }
    const flowers = [
      [10, 5, "#e48ac6"], [21, 1, "#fff2ad"], [31, 2, "#ca70d3"], [44, 11, "#fff2ad"],
      [6, 14, "#e46b6b"], [37, 15, "#f2a2e8"],
    ];
    for (const flower of flowers) {
      ctx.fillStyle = flower[2];
      ctx.fillRect(sx + flower[0], y + flower[1], 4, 4);
      ctx.fillStyle = "#fff6ce";
      ctx.fillRect(sx + flower[0] + 1, y + flower[1] + 1, 1, 1);
    }
    ctx.fillStyle = "#4b2c16";
    ctx.fillRect(sx + 7, y + 39, 42, 3);
  }

  function drawTree(x, y, scale) {
    const sx = Math.round(x);
    const sy = Math.round(y);
    ctx.fillStyle = "#5f3b20";
    ctx.fillRect(sx + Math.round(43 * scale), sy + Math.round(55 * scale), Math.round(18 * scale), Math.round(80 * scale));
    ctx.fillStyle = "#8a5a2d";
    ctx.fillRect(sx + Math.round(48 * scale), sy + Math.round(61 * scale), Math.max(2, Math.round(4 * scale)), Math.round(68 * scale));
    ctx.fillStyle = palettes.leafDark;
    drawPixelBlob(sx, sy, scale, [
      [26, 28, 70, 39], [6, 54, 96, 42], [36, 0, 56, 43], [60, 31, 68, 43],
      [20, 84, 76, 34], [82, 69, 53, 33],
    ], palettes.leafDark);
    drawPixelBlob(sx + Math.round(6 * scale), sy + Math.round(5 * scale), scale, [
      [28, 19, 50, 22], [12, 48, 72, 24], [62, 38, 45, 23], [32, 80, 50, 18],
    ], "#4fab37");
    ctx.fillStyle = "#79c64b";
    for (let i = 0; i < 18; i += 1) {
      const px = sx + Math.round(((i * 29) % 124) * scale);
      const py = sy + Math.round(((i * 43) % 104) * scale);
      ctx.fillRect(px, py, Math.max(2, Math.round(5 * scale)), Math.max(2, Math.round(4 * scale)));
    }
    ctx.fillStyle = "#174b24";
    for (let i = 0; i < 12; i += 1) {
      const px = sx + Math.round(((i * 37 + 9) % 122) * scale);
      const py = sy + Math.round(((i * 31 + 17) % 112) * scale);
      ctx.fillRect(px, py, Math.max(2, Math.round(6 * scale)), Math.max(2, Math.round(4 * scale)));
    }
  }

  function drawPixelBlob(x, y, scale, blocks, color) {
    ctx.fillStyle = color;
    for (const block of blocks) {
      ctx.fillRect(
        Math.round(x + block[0] * scale),
        Math.round(y + block[1] * scale),
        Math.round(block[2] * scale),
        Math.round(block[3] * scale),
      );
    }
  }

  function drawStoneFlecks(x, y, w, h, count, alpha) {
    for (let i = 0; i < count; i += 1) {
      const px = Math.round(x + hash(i * 12.73 + w * 0.31) * w);
      const py = Math.round(y + hash(i * 21.11 + h * 0.17) * h);
      const warm = hash(i * 5.19) > 0.48;
      ctx.fillStyle = warm ? `rgba(255, 223, 150, ${alpha})` : `rgba(80, 49, 29, ${alpha * 0.74})`;
      ctx.fillRect(px, py, hash(i * 2.1) > 0.65 ? 4 : 2, hash(i * 3.2) > 0.72 ? 3 : 2);
    }
  }

  function drawStreetPlaque(x, y, label) {
    const sx = Math.round(x);
    ctx.fillStyle = "#23170f";
    ctx.fillRect(sx, y, 84, 34);
    ctx.fillStyle = "#0b4e8a";
    ctx.fillRect(sx + 4, y + 4, 76, 26);
    ctx.fillStyle = "#2f8ac3";
    ctx.fillRect(sx + 8, y + 7, 68, 3);
    ctx.fillStyle = "#eff8e9";
    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(label, sx + 42, y + 22);
  }

  function drawBench(x, y) {
    const sx = Math.round(x);
    ctx.fillStyle = "#26170f";
    ctx.fillRect(sx + 10, y + 35, 8, 18);
    ctx.fillRect(sx + 90, y + 35, 8, 18);
    ctx.fillStyle = "#6b3f20";
    ctx.fillRect(sx, y + 12, 110, 12);
    ctx.fillRect(sx + 8, y + 31, 96, 10);
    ctx.fillStyle = "#b57435";
    ctx.fillRect(sx + 4, y + 13, 98, 5);
    ctx.fillRect(sx + 12, y + 32, 84, 4);
    ctx.fillStyle = "#2f2017";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(sx + 8 + i * 20, y + 23, 7, 12);
    }
  }

  function drawBollards(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const sx = Math.round(x + i * 36);
      ctx.fillStyle = "#111719";
      ctx.fillRect(sx, y + 7, 10, 30);
      ctx.fillRect(sx - 3, y + 34, 16, 5);
      ctx.fillStyle = "#39464c";
      ctx.fillRect(sx + 2, y + 10, 3, 21);
      ctx.fillStyle = "#d6b66a";
      ctx.fillRect(sx - 1, y, 12, 8);
    }
  }

  function drawArch(x, y) {
    const sx = Math.round(x);
    const sy = Math.round(y);
    const w = 520;
    const h = 235;
    if (sx > VIEW_W + 80 || sx + w < -80) {
      return;
    }

    ctx.fillStyle = palettes.stoneDark;
    ctx.fillRect(sx - 12, sy + h - 10, w + 24, 12);
    ctx.fillStyle = palettes.stone;
    ctx.fillRect(sx, sy + 40, w, h - 40);
    drawStoneFlecks(sx + 8, sy + 48, w - 16, h - 54, 78, 0.62);
    ctx.fillStyle = palettes.stoneLight;
    ctx.fillRect(sx + 18, sy + 50, w - 36, 14);
    ctx.fillRect(sx - 14, sy + 33, w + 28, 12);
    ctx.fillRect(sx - 26, sy + 134, w + 52, 13);
    ctx.fillStyle = "#f5daa2";
    ctx.fillRect(sx - 9, sy + 35, w + 18, 3);
    ctx.fillRect(sx - 20, sy + 136, w + 40, 3);
    ctx.fillStyle = "#795535";
    ctx.fillRect(sx + 24, sy + 145, w - 48, 12);

    ctx.fillStyle = "#7f5733";
    for (let bx = 18; bx < w - 18; bx += 34) {
      ctx.fillRect(sx + bx, sy + 151, 17, 40);
      ctx.fillStyle = "#b48655";
      ctx.fillRect(sx + bx + 2, sy + 153, 4, 34);
      ctx.fillStyle = "#7f5733";
    }

    drawStoneBlocks(sx, sy + 67, w, 67, 24, 13);
    drawStoneBlocks(sx + 28, sy + 150, 132, 82, 20, 14);
    drawStoneBlocks(sx + w - 160, sy + 150, 132, 82, 20, 14);

    ctx.fillStyle = palettes.stoneLight;
    ctx.fillRect(sx + 76, sy + 63, w - 152, 55);
    ctx.fillStyle = palettes.stoneGold;
    ctx.fillRect(sx + 86, sy + 69, w - 172, 4);
    drawStoneFlecks(sx + 84, sy + 77, w - 168, 34, 28, 0.7);
    ctx.fillStyle = "#5d3f25";
    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("LUDOVICO MAGNO LXXII ANNOS REGNANTE", sx + w / 2, sy + 86);
    ctx.fillText("DISSOCIATIS REPRESSIS CONCILIATIS GENTIBUS", sx + w / 2, sy + 103);
    ctx.fillText("QUATUOR DECENNALI BELLO CONJURATIS", sx + w / 2, sy + 120);
    ctx.fillText("PAX TERRA MARIQUE PANTA 1715", sx + w / 2, sy + 137);

    ctx.fillStyle = palettes.skyLow;
    ctx.beginPath();
    ctx.rect(sx + 212, sy + 200, 96, 62);
    ctx.moveTo(sx + 212, sy + 202);
    ctx.quadraticCurveTo(sx + 260, sy + 119, sx + 308, sy + 202);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#457d8c";
    ctx.fillRect(sx + 232, sy + 212, 57, 3);
    ctx.fillRect(sx + 225, sy + 229, 73, 3);
    ctx.fillStyle = "rgba(255, 255, 235, 0.35)";
    ctx.fillRect(sx + 234, sy + 205, 20, 3);
    ctx.fillRect(sx + 267, sy + 220, 28, 3);

    ctx.fillStyle = palettes.stoneDark;
    ctx.fillRect(sx + 190, sy + 190, 20, 57);
    ctx.fillRect(sx + 310, sy + 190, 20, 57);
    ctx.fillStyle = palettes.stoneLight;
    ctx.fillRect(sx + 204, sy + 177, 112, 11);
    ctx.fillStyle = "#f5dca0";
    ctx.fillRect(sx + 209, sy + 179, 102, 3);

    drawRelief(sx + 68, sy + 165);
    drawRelief(sx + 392, sy + 165);
    drawShield(sx + 248, sy + 159);
    drawFlag(sx + 267, sy - 28);
  }

  function drawStoneBlocks(x, y, w, h, cellW, cellH) {
    ctx.fillStyle = "rgba(84, 55, 34, 0.45)";
    for (let yy = 0; yy <= h; yy += cellH) {
      ctx.fillRect(Math.round(x), Math.round(y + yy), Math.round(w), 1);
    }
    for (let yy = 0; yy < h; yy += cellH) {
      const offset = (yy / cellH) % 2 ? cellW / 2 : 0;
      for (let xx = offset; xx <= w; xx += cellW) {
        ctx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, Math.round(cellH));
      }
    }
  }

  function drawRelief(x, y) {
    ctx.fillStyle = "#4a2b18";
    ctx.fillRect(x, y, 64, 54);
    ctx.fillStyle = "#a77b4e";
    for (let i = 0; i < 14; i += 1) {
      ctx.fillRect(x + 8 + ((i * 13) % 48), y + 6 + ((i * 17) % 40), 10, 10);
    }
    ctx.fillStyle = "#322015";
    ctx.fillRect(x + 18, y + 18, 28, 25);
  }

  function drawShield(x, y) {
    ctx.fillStyle = "#4d301c";
    ctx.fillRect(x - 12, y - 5, 48, 58);
    ctx.fillStyle = "#d8ba74";
    ctx.fillRect(x - 5, y, 34, 44);
    ctx.fillStyle = "#1f63a0";
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 8);
    ctx.lineTo(x + 26, y + 15);
    ctx.lineTo(x + 21, y + 38);
    ctx.lineTo(x + 12, y + 45);
    ctx.lineTo(x + 3, y + 38);
    ctx.lineTo(x - 2, y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e9d99d";
    ctx.fillRect(x + 10, y + 15, 5, 18);
  }

  function drawFlag(x, y) {
    ctx.fillStyle = "#2a2a25";
    ctx.fillRect(x, y, 5, 75);
    ctx.fillStyle = "#0d4b96";
    ctx.fillRect(x + 5, y + 7, 15, 31);
    ctx.fillStyle = "#f7f5ea";
    ctx.fillRect(x + 20, y + 9, 15, 29);
    ctx.fillStyle = "#d64035";
    ctx.fillRect(x + 35, y + 11, 15, 27);
    ctx.fillStyle = "#23361e";
    ctx.fillRect(x - 9, y + 75, 24, 7);
  }

  function drawTrashCan(x, y) {
    const sx = Math.round(x);
    ctx.fillStyle = "#154c36";
    ctx.fillRect(sx, y + 12, 35, 54);
    ctx.fillStyle = "#1f8a59";
    ctx.fillRect(sx + 5, y + 15, 24, 47);
    ctx.fillStyle = "#0c2e22";
    ctx.fillRect(sx - 3, y + 8, 41, 8);
    ctx.fillRect(sx + 6, y + 65, 24, 4);
    ctx.fillStyle = "#6fd097";
    ctx.fillRect(sx + 10, y + 19, 5, 38);
  }

  function drawRailing(x, y) {
    ctx.strokeStyle = "#111719";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 46);
    ctx.lineTo(x + 260, y + 46);
    ctx.moveTo(x, y + 23);
    ctx.lineTo(x + 260, y + 23);
    ctx.stroke();
    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = "#111719";
      ctx.fillRect(Math.round(x + i * 22), y + 8, 5, 48);
      ctx.fillRect(Math.round(x + i * 22 - 2), y + 3, 9, 7);
    }
  }

  function drawGround(cameraX) {
    const startTile = Math.max(0, Math.floor(cameraX / 16) - 2);
    const endTile = Math.min(Math.ceil((cameraX + VIEW_W) / 16) + 3, Math.ceil(WORLD_W / 16));

    ctx.fillStyle = "#4a3124";
    ctx.fillRect(0, GROUND_Y + 22, VIEW_W, VIEW_H - GROUND_Y - 22);
    ctx.fillStyle = "#1d1714";
    ctx.fillRect(0, GROUND_Y + 18, VIEW_W, 6);
    for (let tile = startTile; tile < endTile; tile += 1) {
      const x = tile * 16 - cameraX;
      const color = tileColor(tile, 0);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), GROUND_Y, 16, 16);
      ctx.fillStyle = "#e1bd7f";
      ctx.fillRect(Math.round(x) + 2, GROUND_Y + 1, 12, 3);
      ctx.fillStyle = hash(tile * 3.7) > 0.55 ? "#6c492f" : "#c18a52";
      ctx.fillRect(Math.round(x) + 3 + (tile % 3), GROUND_Y + 8, 4, 3);
      ctx.fillStyle = "#21160f";
      ctx.fillRect(Math.round(x), GROUND_Y + 15, 16, 2);
    }
    drawCobbleLip(cameraX, startTile, endTile);

    for (let row = 0; row < 7; row += 1) {
      const y = GROUND_Y + 22 + row * 18;
      for (let tile = startTile; tile < endTile; tile += 1) {
        const x = tile * 16 - cameraX + ((row % 2) * 8);
        ctx.fillStyle = tileColor(tile, row + 1);
        ctx.fillRect(Math.round(x), y, 18, 16);
        ctx.fillStyle = "rgba(235, 189, 112, 0.42)";
        if (hash(tile * 23 + row * 7) > 0.5) {
          ctx.fillRect(Math.round(x) + 3, y + 3, 7, 2);
        }
        ctx.fillStyle = "rgba(24, 17, 12, 0.34)";
        if (hash(tile * 11 + row * 19) > 0.62) {
          ctx.fillRect(Math.round(x) + 9, y + 8, 5, 3);
        }
        ctx.fillStyle = "#241610";
        ctx.fillRect(Math.round(x), y + 15, 18, 2);
        ctx.fillRect(Math.round(x) + 17, y, 2, 16);
      }
    }

    drawDrain(590 - cameraX, GROUND_Y + 72);
    drawDrain(1600 - cameraX, GROUND_Y + 74);
    drawDrain(3040 - cameraX, GROUND_Y + 73);

    drawIvy(470 - cameraX, GROUND_Y + 21, 85, 87);
    drawIvy(1820 - cameraX, GROUND_Y + 25, 70, 78);
    drawIvy(2865 - cameraX, GROUND_Y + 19, 90, 88);

    for (const platform of state.level.platforms) {
      if (platform.kind !== "ledge") {
        continue;
      }
      drawLedge(platform.x - cameraX, platform.y, platform.w, platform.h);
    }
  }

  function drawCobbleLip(cameraX, startTile, endTile) {
    for (let tile = startTile; tile < endTile; tile += 1) {
      const x = Math.round(tile * 16 - cameraX);
      const lift = tile % 2 === 0 ? 0 : 2;
      ctx.fillStyle = tile % 3 === 0 ? "#d5a466" : "#bd8250";
      ctx.fillRect(x + 1, GROUND_Y - 6 + lift, 14, 6);
      ctx.fillStyle = "#efd08f";
      ctx.fillRect(x + 3, GROUND_Y - 5 + lift, 9, 2);
      ctx.fillStyle = "#2a1b12";
      ctx.fillRect(x, GROUND_Y - 1 + lift, 16, 2);
    }
  }

  function drawDrain(x, y) {
    const sx = Math.round(x);
    if (sx < -40 || sx > VIEW_W + 40) {
      return;
    }
    ctx.fillStyle = "#211710";
    ctx.fillRect(sx, y, 35, 31);
    ctx.fillStyle = "#5a3c26";
    ctx.fillRect(sx + 4, y + 4, 27, 23);
    ctx.fillStyle = "#15100d";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(sx + 7 + i * 5, y + 7, 3, 17);
    }
    ctx.fillStyle = "#b18451";
    ctx.fillRect(sx + 5, y + 4, 23, 3);
  }

  function drawLedge(x, y, w, h) {
    const sx = Math.round(x);
    ctx.fillStyle = palettes.stoneDark;
    ctx.fillRect(sx - 4, y + h - 2, w + 8, 8);
    ctx.fillStyle = palettes.stone;
    ctx.fillRect(sx, y, w, h);
    for (let i = 0; i < w; i += 18) {
      ctx.fillStyle = tileColor(i + sx, 9);
      ctx.fillRect(sx + i, y, Math.min(18, w - i), h - 2);
      ctx.fillStyle = "#e7be7d";
      ctx.fillRect(sx + i + 2, y + 2, Math.min(12, w - i - 2), 3);
      ctx.fillStyle = "#20140f";
      ctx.fillRect(sx + i, y + h - 2, Math.min(18, w - i), 2);
    }
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(sx + 3, y + h, w - 6, 5);
  }

  function drawIvy(x, y, w, h) {
    ctx.fillStyle = "#1c5e29";
    for (let i = 0; i < 30; i += 1) {
      const xx = Math.round(x + ((i * 17) % w));
      const yy = Math.round(y + ((i * 23) % h));
      ctx.fillRect(xx, yy, 7, 11);
    }
    ctx.fillStyle = "#43a33c";
    for (let i = 0; i < 13; i += 1) {
      const xx = Math.round(x + ((i * 29) % w));
      const yy = Math.round(y + ((i * 19) % h));
      ctx.fillRect(xx, yy, 5, 6);
    }
  }

  function drawHazards(cameraX, generatedScene) {
    for (const hazard of state.level.hazards) {
      const x = Math.round(hazard.x - cameraX);
      if (x > VIEW_W || x + hazard.w < 0) {
        continue;
      }
      if (generatedScene) {
        drawGeneratedHazard(hazard, x);
        continue;
      }
      ctx.fillStyle = "#251714";
      ctx.fillRect(x, hazard.y, hazard.w, hazard.h);
      ctx.fillStyle = "#100b0a";
      ctx.fillRect(x + 4, hazard.y + 7, hazard.w - 8, 3);
      ctx.fillStyle = "#5b4639";
      for (let i = 7; i < hazard.w - 5; i += 13) {
        ctx.fillRect(x + i, hazard.y + 2, 6, 3);
      }
      if (isHazardActive(hazard)) {
        if (drawGeneratedSteam(hazard, x)) {
          continue;
        }
        ctx.fillStyle = "rgba(210, 242, 255, 0.78)";
        for (let i = 0; i < 4; i += 1) {
          const sx = x + 10 + i * 14;
          const lift = 8 + Math.sin(state.elapsed * 10 + i) * 5;
          ctx.fillRect(Math.round(sx), Math.round(hazard.y - 13 - lift), 5, 16);
          ctx.fillRect(Math.round(sx - 3), Math.round(hazard.y - 24 - lift), 11, 5);
          ctx.fillStyle = "rgba(255,255,255,0.64)";
          ctx.fillRect(Math.round(sx + 2), Math.round(hazard.y - 21 - lift), 2, 8);
          ctx.fillStyle = "rgba(210, 242, 255, 0.78)";
        }
      }
    }
  }

  function drawGeneratedHazard(hazard, x) {
    if (!isHazardActive(hazard)) {
      return false;
    }
    if (hazard.kind === "thorn") {
      return drawGeneratedThorn(hazard, x);
    }
    return drawGeneratedSteam(hazard, x);
  }

  function drawGeneratedThorn(hazard, x) {
    const asset = generatedAssets.level2Atlas;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    return drawGeneratedFrame(asset.image, 720, 900, 330, 92, x - 6, hazard.y - 30, hazard.w + 12, 44, false);
  }

  function drawGeneratedSteam(hazard, x) {
    const asset = generatedAssets.atlas;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    const frame = Math.floor(state.elapsed * 8 + hazard.phase * 10) % 3;
    const sourceX = 735 + frame * 245;
    return drawGeneratedFrame(asset.image, sourceX, 225, 240, 245, x + hazard.w / 2 - 32, hazard.y - 66, 64, 70, false);
  }

  function drawGeneratedCoinFrame(frame, x, y) {
    const asset = generatedAssets.atlas;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    const sourceW = 190;
    const sourceH = 230;
    return drawGeneratedFrame(asset.image, frame * sourceW, 225, sourceW, sourceH, x - 17, y - 17, 34, 34, false);
  }

  function drawCoins(cameraX, generatedScene) {
    for (const coin of state.level.coins) {
      if (coin.taken) {
        continue;
      }
      const x = Math.round(coin.x - cameraX);
      if (x < -20 || x > VIEW_W + 20) {
        continue;
      }
      const y = Math.round(coin.y + Math.sin(state.elapsed * 4 + coin.bob) * 3);
      const frame = Math.floor(state.elapsed * 8 + coin.id) % 4;
      if (!drawGeneratedCoinFrame(frame, x, y)) {
        if (generatedScene) {
          continue;
        }
        drawSprite(sprites.coin[frame] || sprites.coin[0], x - 9, y - 9, false);
      }
      if ((Math.floor(state.elapsed * 7 + coin.id) % 9) === 0) {
        ctx.fillStyle = "#fff5ad";
        ctx.fillRect(x + 10, y - 12, 3, 3);
        ctx.fillRect(x + 13, y - 9, 2, 2);
      }
    }
  }

  function drawGeneratedRat(enemy, x, frame) {
    const asset = generatedAssets.atlas;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    const sourceW = 384;
    const sourceH = 225;
    const destW = enemy.alive ? 70 : 64;
    const destH = enemy.alive ? 42 : 36;
    return drawGeneratedFrame(
      asset.image,
      frame * sourceW,
      0,
      sourceW,
      sourceH,
      x - 15,
      enemy.y - 20,
      destW,
      destH,
      enemy.dir > 0,
    );
  }

  function drawGeneratedPlantMonster(enemy, x, frame) {
    const asset = generatedAssets.plantMonster;
    if (!isDrawableImage(asset.image)) {
      return false;
    }
    const frames = [
      [88, 780, 300, 360],
      [470, 780, 330, 360],
      [875, 790, 330, 330],
    ];
    const source = frames[frame] || frames[0];
    const destW = enemy.alive ? 78 : 72;
    const destH = enemy.alive ? 78 : 58;
    return drawGeneratedFrame(
      asset.image,
      source[0],
      source[1],
      source[2],
      source[3],
      x - 18,
      enemy.alive ? enemy.y - 29 : enemy.y - 6,
      destW,
      destH,
      enemy.dir > 0,
    );
  }

  function drawEnemies(cameraX, generatedScene) {
    for (const enemy of state.level.enemies) {
      const x = Math.round(enemy.x - cameraX);
      if (x < -70 || x > VIEW_W + 70) {
        continue;
      }
      if (!enemy.alive && enemy.defeatTime > 0.4) {
        continue;
      }
      const frame = enemy.alive ? Math.floor(state.elapsed * 7 + enemy.id) % 2 : 2;
      const isPlant = enemy.kind === "plant";
      drawGroundShadow(x + 21, enemy.y + (isPlant ? 47 : 25), isPlant ? 42 : enemy.alive ? 36 : 26, 6, 0.28);
      const drewEnemy = isPlant
        ? drawGeneratedPlantMonster(enemy, x, enemy.alive ? frame : 2)
        : drawGeneratedRat(enemy, x, enemy.alive ? frame : 3);
      if (!drewEnemy) {
        if (generatedScene) {
          continue;
        }
        drawSprite(sprites.rat[frame], x - 4, enemy.y - 7, enemy.dir < 0);
      }
    }
  }

  function drawGeneratedPlayer(frame, cameraX, yOffset) {
    if (frame === "runA" || frame === "runB") {
      const drewRunCycle = drawGeneratedRunCycle(cameraX, yOffset);
      if (drewRunCycle) {
        return true;
      }
    }

    const asset = generatedAssets.player;
    if (!isDrawableImage(asset.image)) {
      return false;
    }

    const frameMap = {
      idle: 0,
      runA: 1,
      runB: 2,
      jump: 3,
      attack: 4,
    };
    const frameIndex = frameMap[frame] ?? 0;
    const col = frameIndex % 4;
    const row = Math.floor(frameIndex / 4);
    const cellW = Math.floor(asset.image.width / 4);
    const cellH = Math.floor(asset.image.height / 2);
    const size = frame === "attack" ? 106 : 94;
    const player = state.player;
    const running = frame === "runA" || frame === "runB";
    const runPhase = Math.floor(player.step) % 4;
    const runBob = running ? (runPhase % 2 === 0 ? -3 : 1) : 0;
    const runLean = running ? player.facing * (runPhase % 2 === 0 ? 2 : -1) : 0;
    const dx = player.x - cameraX - (size - player.w) / 2 - (frame === "attack" ? 6 * player.facing : 0) + runLean;
    const dy = player.y + player.h - size + 8 + yOffset + runBob;

    return drawGeneratedFrame(
      asset.image,
      col * cellW + 2,
      row * cellH + 2,
      cellW,
      cellH,
      dx,
      dy,
      size,
      size,
      player.facing < 0,
    );
  }

  function drawGeneratedRunCycle(cameraX, yOffset) {
    const asset = generatedAssets.run;
    if (!isDrawableImage(asset.image)) {
      return false;
    }

    const player = state.player;
    const sourceFrameCount = 8;
    const cellW = Math.floor(asset.image.width / sourceFrameCount);
    const cellH = asset.image.height;
    const frameIndex = RUN_FRAME_SEQUENCE[Math.floor(player.step) % RUN_FRAME_SEQUENCE.length];
    const drawSize = 91;
    const sourceBaseline = 119;
    const baseline = (sourceBaseline / cellH) * drawSize;
    const dx = player.x - cameraX + player.w / 2 - drawSize / 2;
    const dy = player.y + player.h - baseline + yOffset;

    return drawGeneratedFrame(
      asset.image,
      frameIndex * cellW,
      0,
      cellW,
      cellH,
      dx,
      dy,
      drawSize,
      drawSize,
      player.facing < 0,
    );
  }

  function drawPlayer(cameraX, yOffset) {
    const player = state.player;
    const x = Math.round(player.x - cameraX - 12);
    const y = Math.round(player.y - 8 + yOffset);
    if (player.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    let frame = "idle";
    if (player.attack > 0) {
      frame = "attack";
    } else if (!player.onGround) {
      frame = "jump";
    } else if (Math.abs(player.vx) > 20) {
      frame = Math.floor(player.step) % 2 === 0 ? "runA" : "runB";
    }

    drawGroundShadow(Math.round(player.x - cameraX + player.w / 2), GROUND_Y + 2, player.onGround ? 34 : 24, 8, player.onGround ? 0.34 : 0.18);
    drawRunDust(cameraX);
    if (!drawGeneratedPlayer(frame, cameraX, yOffset)) {
      drawSprite(sprites.player[frame], x, y, player.facing < 0);
    }
    ctx.globalAlpha = 1;

    if (player.attack > 0) {
      const hit = getAttackBox();
      const sparkX = Math.round(hit.x - cameraX);
      ctx.fillStyle = "rgba(255, 235, 150, 0.42)";
      ctx.fillRect(sparkX, Math.round(hit.y + 5), hit.w, 5);
      ctx.fillRect(sparkX + 8, Math.round(hit.y), hit.w - 12, 4);
      ctx.fillStyle = "#fff3a6";
      ctx.fillRect(sparkX + 4, Math.round(hit.y + 9), hit.w - 8, 4);
      ctx.fillRect(sparkX + hit.w - 6, Math.round(hit.y + 15), 6, 3);
      ctx.fillStyle = "#f6b935";
      ctx.fillRect(sparkX + hit.w - 13, Math.round(hit.y + 4), 5, 5);
    }
  }

  function drawForeground(cameraX) {
    ctx.fillStyle = "rgba(10, 11, 14, 0.18)";
    ctx.fillRect(0, VIEW_H - 34, VIEW_W, 34);
    ctx.fillStyle = "rgba(255, 232, 156, 0.14)";
    for (let i = 0; i < 36; i += 1) {
      const x = wrap(i * 67 - cameraX * 0.55, -20, VIEW_W + 20);
      const y = GROUND_Y + 4 + ((i * 29) % 22);
      ctx.fillRect(Math.round(x), y, 5, 2);
    }

    drawCheckpointFlag(3588 - cameraX, GROUND_Y - 105);
  }

  function drawFinishGate(x, y) {
    const asset = activeLevelIndex === 1 ? generatedAssets.level2Atlas : generatedAssets.finishGate;
    const sx = Math.round(x);
    const sy = Math.round(activeLevelIndex === 1 ? GROUND_Y - 166 : y);
    const w = activeLevelIndex === 1 ? 132 : 216;
    const h = activeLevelIndex === 1 ? 166 : 183;
    if (sx < -w - 20 || sx > VIEW_W + 20) {
      return;
    }

    if (!isDrawableImage(asset.image)) {
      return;
    }
    drawGroundShadow(sx + w / 2, GROUND_Y + 3, activeLevelIndex === 1 ? 92 : 188, 10, 0.32);
    if (activeLevelIndex === 1) {
      drawGeneratedFrame(asset.image, 555, 330, 190, 295, sx, sy, w, h, false);
      return;
    }
    drawGeneratedFrame(asset.image, 0, 0, asset.image.width, asset.image.height, sx, sy, w, h, false);
  }

  function drawCheckpointFlag(x, y) {
    const sx = Math.round(x);
    if (sx < -40 || sx > VIEW_W + 40) {
      return;
    }
    ctx.fillStyle = "#251b15";
    ctx.fillRect(sx, y, 5, 105);
    ctx.fillStyle = "#f1bd34";
    ctx.fillRect(sx + 5, y + 9, 48, 33);
    ctx.fillStyle = "#70420e";
    ctx.fillRect(sx + 15, y + 18, 16, 14);
    ctx.fillStyle = "#14283a";
    ctx.fillRect(sx - 10, y + 102, 25, 8);
  }

  function drawGroundShadow(x, y, w, h, alpha) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    const sx = Math.round(x - w / 2);
    ctx.fillRect(sx + 4, Math.round(y), w - 8, h);
    ctx.fillRect(sx, Math.round(y + 2), w, Math.max(2, h - 4));
  }

  function drawRunDust(cameraX) {
    const player = state.player;
    if (!player.onGround || Math.abs(player.vx) < 90) {
      return;
    }
    const phase = Math.floor(player.step * 2) % 4;
    const baseX = Math.round(player.x - cameraX + (player.facing > 0 ? 4 : player.w - 4));
    const baseY = Math.round(player.y + player.h - 5);
    ctx.fillStyle = "rgba(224, 191, 127, 0.7)";
    ctx.fillRect(baseX - player.facing * (10 + phase * 2), baseY - 1, 5, 3);
    ctx.fillRect(baseX - player.facing * (18 + phase), baseY + 3, 3, 2);
    if (phase % 2 === 0) {
      ctx.fillStyle = "rgba(255, 232, 170, 0.55)";
      ctx.fillRect(baseX - player.facing * 24, baseY + 1, 2, 2);
    }
  }

  function drawPixelAtmosphere(cameraX) {
    ctx.fillStyle = "rgba(255, 241, 190, 0.28)";
    for (let i = 0; i < 34; i += 1) {
      const x = wrap(i * 97 - cameraX * 0.18, -16, VIEW_W + 16);
      const y = 176 + ((i * 53 + Math.floor(state.elapsed * 8)) % 142);
      if (i % 3 === 0) {
        ctx.fillRect(Math.round(x), y, 2, 2);
      }
    }

    ctx.fillStyle = "rgba(22, 61, 54, 0.18)";
    for (let i = 0; i < 20; i += 1) {
      const x = wrap(i * 121 - cameraX * 0.78, -24, VIEW_W + 24);
      const y = GROUND_Y - 8 + ((i * 17 + Math.floor(state.elapsed * 3)) % 18);
      ctx.fillRect(Math.round(x), y, 8, 3);
    }
  }

  function drawPixelVignette() {
    ctx.fillStyle = "rgba(12, 14, 18, 0.1)";
    ctx.fillRect(0, 0, VIEW_W, 4);
    ctx.fillRect(0, VIEW_H - 4, VIEW_W, 4);
    ctx.fillRect(0, 0, 4, VIEW_H);
    ctx.fillRect(VIEW_W - 4, 0, 4, VIEW_H);
    ctx.fillStyle = "rgba(255, 244, 190, 0.04)";
    for (let y = 0; y < VIEW_H; y += 8) {
      ctx.fillRect(0, y, VIEW_W, 1);
    }
  }

  function buildSprites() {
    return {
      player: {
        idle: makePlayerSprite("idle"),
        runA: makePlayerSprite("runA"),
        runB: makePlayerSprite("runB"),
        jump: makePlayerSprite("jump"),
        attack: makePlayerSprite("attack"),
      },
      rat: [makeRatSprite(0), makeRatSprite(1), makeRatSprite(2)],
      coin: [makeCoinSprite(0), makeCoinSprite(1), makeCoinSprite(2), makeCoinSprite(3)],
    };
  }

  function makeCanvas(w, h) {
    const sprite = document.createElement("canvas");
    sprite.width = w;
    sprite.height = h;
    const spriteCtx = sprite.getContext("2d");
    spriteCtx.imageSmoothingEnabled = false;
    return { canvas: sprite, ctx: spriteCtx };
  }

  function loadGeneratedImage(src) {
    const image = new Image();
    const asset = { image, loaded: false, failed: false };
    image.decoding = "async";
    image.onload = () => {
      asset.loaded = true;
      if (src.includes("givros-sprites")) {
        drawPortrait();
      }
    };
    image.onerror = () => {
      asset.failed = true;
    };
    image.src = src;
    return asset;
  }

  function makePlayerSprite(pose) {
    const { canvas: sprite, ctx: sctx } = makeCanvas(52, 62);
    const skin = "#7a3f22";
    const skinMid = "#96542d";
    const skinLight = "#c57a45";
    const hair = "#0b0908";
    const hairSoft = "#1d1612";
    const shirt = "#123857";
    const shirtLight = "#28709b";
    const shirtDark = "#0a2137";
    const pants = "#b98843";
    const pantsDark = "#735022";
    const shoe = "#f3f2e9";
    const shoeShade = "#8d8d84";
    const outline = "#120c0a";

    const legSwing = pose === "runA" ? -4 : pose === "runB" ? 4 : 0;
    const backLegSwing = -legSwing;
    const armSwing = pose === "runA" ? 4 : pose === "runB" ? -3 : 0;
    const jumpLift = pose === "jump" ? -2 : 0;
    const crouch = pose === "jump" ? 1 : 0;

    rect(sctx, 17 + legSwing, 37 + crouch, 9, 18, outline);
    rect(sctx, 19 + legSwing, 38 + crouch, 7, 16, pants);
    rect(sctx, 23 + legSwing, 39 + crouch, 3, 14, pantsDark);
    rect(sctx, 14 + legSwing, 54, 16, 6, outline);
    rect(sctx, 13 + legSwing, 52, 16, 5, shoe);
    rect(sctx, 14 + legSwing, 56, 13, 2, shoeShade);

    rect(sctx, 30 + backLegSwing, 37, 9, 18, outline);
    rect(sctx, 31 + backLegSwing, 38, 7, 16, pants);
    rect(sctx, 35 + backLegSwing, 39, 3, 13, pantsDark);
    rect(sctx, 28 + backLegSwing, 54, 16, 6, outline);
    rect(sctx, 28 + backLegSwing, 52, 15, 5, shoe);
    rect(sctx, 29 + backLegSwing, 56, 13, 2, shoeShade);

    rect(sctx, 16, 23 + jumpLift, 24, 22, outline);
    rect(sctx, 18, 24 + jumpLift, 20, 20, shirt);
    rect(sctx, 20, 25 + jumpLift, 15, 4, shirtLight);
    rect(sctx, 18, 39 + jumpLift, 20, 4, shirtDark);
    rect(sctx, 28, 27 + jumpLift, 3, 12, "#ffffff");
    rect(sctx, 28, 30 + jumpLift, 3, 3, "#dd4f3d");

    rect(sctx, 13, 27 + jumpLift + armSwing, 8, 17, outline);
    rect(sctx, 15, 28 + jumpLift + armSwing, 5, 13, skin);
    rect(sctx, 15, 28 + jumpLift + armSwing, 5, 4, skinLight);
    rect(sctx, 36, 27 + jumpLift - armSwing, 8, 17, outline);
    rect(sctx, 37, 28 + jumpLift - armSwing, 5, 13, skin);
    rect(sctx, 37, 28 + jumpLift - armSwing, 5, 4, skinLight);

    if (pose === "attack") {
      rect(sctx, 37, 30, 15, 8, outline);
      rect(sctx, 38, 31, 13, 5, skinLight);
      rect(sctx, 47, 31, 5, 5, skin);
      rect(sctx, 49, 29, 3, 3, "#fff1c9");
    }

    rect(sctx, 17, 8 + jumpLift, 23, 20, outline);
    rect(sctx, 19, 10 + jumpLift, 20, 17, skin);
    rect(sctx, 21, 12 + jumpLift, 16, 4, skinMid);
    rect(sctx, 23, 22 + jumpLift, 12, 3, skinLight);
    rect(sctx, 23, 16 + jumpLift, 3, 3, "#060606");
    rect(sctx, 35, 16 + jumpLift, 3, 3, "#060606");
    rect(sctx, 24, 15 + jumpLift, 4, 1, "#fff0c9");
    rect(sctx, 34, 15 + jumpLift, 4, 1, "#fff0c9");
    rect(sctx, 30, 19 + jumpLift, 3, 2, "#4b2114");
    rect(sctx, 30, 23 + jumpLift, 8, 2, "#fff1d4");
    rect(sctx, 35, 23 + jumpLift, 3, 2, "#d8d1c0");
    rect(sctx, 39, 17 + jumpLift, 4, 6, skin);

    rect(sctx, 16, 4 + jumpLift, 25, 9, hair);
    rect(sctx, 13, 8 + jumpLift, 12, 10, hair);
    rect(sctx, 24, 1 + jumpLift, 11, 8, hair);
    rect(sctx, 34, 2 + jumpLift, 9, 11, hair);
    rect(sctx, 39, 10 + jumpLift, 7, 9, hair);
    rect(sctx, 14, 17 + jumpLift, 5, 7, hair);
    rect(sctx, 19, 5 + jumpLift, 4, 4, hairSoft);
    rect(sctx, 29, 3 + jumpLift, 4, 4, hairSoft);
    rect(sctx, 37, 7 + jumpLift, 3, 4, hairSoft);

    return sprite;
  }

  function makeRatSprite(frame) {
    const { canvas: sprite, ctx: sctx } = makeCanvas(52, 32);
    const body = frame === 2 ? "#4c4c4c" : "#343936";
    const bodyDark = "#202320";
    const light = "#70746d";
    const pink = "#d47a73";
    const outline = "#151210";
    const leg = frame === 1 ? 2 : 0;

    rect(sctx, 6, 16, 31, 11, outline);
    rect(sctx, 10, 11, 27, 16, body);
    rect(sctx, 11, 20, 25, 7, bodyDark);
    rect(sctx, 30, 13, 12, 10, outline);
    rect(sctx, 32, 12, 10, 9, body);
    rect(sctx, 34, 8, 7, 6, pink);
    rect(sctx, 36, 7, 5, 4, outline);
    rect(sctx, 39, 16, 3, 3, "#f5d0bd");
    rect(sctx, 42, 18, 4, 2, pink);
    rect(sctx, 43, 16, 4, 1, "#f4ddd2");
    rect(sctx, 16, 12, 14, 4, light);
    rect(sctx, 13, 14, 6, 3, "#8a8d84");
    rect(sctx, 11, 25, 8, 4 + leg, pink);
    rect(sctx, 26, 25, 8, 4 - leg, pink);
    rect(sctx, 0, 24, 14, 4, pink);
    rect(sctx, 0, 22, 8, 3, outline);
    rect(sctx, 3, 21, 3, 2, pink);
    rect(sctx, 44, 20, 6, 1, "#f2b1a7");
    rect(sctx, 44, 23, 5, 1, "#f2b1a7");

    if (frame === 2) {
      sctx.globalAlpha = 0.55;
      rect(sctx, 8, 21, 30, 6, "#1a1614");
      sctx.globalAlpha = 1;
    }
    return sprite;
  }

  function makeCoinSprite(frame) {
    const { canvas: sprite, ctx: sctx } = makeCanvas(18, 18);
    const narrow = frame === 1 || frame === 3;
    const x = narrow ? 6 : 3;
    const w = narrow ? 6 : 12;
    rect(sctx, x + 1, 0, w - 2, 2, "#fff3a7");
    rect(sctx, x, 2, w, 14, "#6d3904");
    rect(sctx, x + 1, 3, w - 2, 12, "#bc700b");
    rect(sctx, x + 2, 3, w - 4, 11, "#f2b42e");
    rect(sctx, x + 4, 5, Math.max(1, w - 8), 7, "#ffdb62");
    rect(sctx, x + 4, 7, Math.max(1, w - 9), 2, "#fff1a1");
    rect(sctx, x + 1, 15, w - 2, 2, "#3b2106");
    return sprite;
  }

  function drawPortrait() {
    const pctx = portraitCtx;
    pctx.clearRect(0, 0, portraitCanvas.width, portraitCanvas.height);
    pctx.fillStyle = "#10233c";
    pctx.fillRect(0, 0, portraitCanvas.width, portraitCanvas.height);
    pctx.fillStyle = "#23486f";
    pctx.fillRect(4, 4, 50, 4);
    pctx.fillRect(4, 4, 4, 50);
    pctx.fillStyle = "#0b0b0b";
    pctx.fillRect(15, 5, 29, 17);
    pctx.fillRect(10, 13, 13, 15);
    pctx.fillRect(37, 13, 10, 16);
    pctx.fillStyle = "#1e1713";
    pctx.fillRect(22, 4, 10, 5);
    pctx.fillRect(39, 17, 5, 8);
    pctx.fillStyle = "#7a3f22";
    pctx.fillRect(16, 18, 28, 25);
    pctx.fillStyle = "#a96032";
    pctx.fillRect(20, 22, 20, 7);
    pctx.fillStyle = "#b66d3c";
    pctx.fillRect(21, 35, 17, 5);
    pctx.fillStyle = "#080808";
    pctx.fillRect(22, 27, 4, 4);
    pctx.fillRect(36, 27, 4, 4);
    pctx.fillStyle = "#fff0d1";
    pctx.fillRect(23, 26, 2, 1);
    pctx.fillRect(37, 26, 2, 1);
    pctx.fillStyle = "#fff1d4";
    pctx.fillRect(28, 37, 10, 4);
    pctx.fillStyle = "#183a5c";
    pctx.fillRect(13, 45, 33, 13);
    pctx.fillStyle = "#2b6e93";
    pctx.fillRect(17, 47, 25, 4);
  }

  function drawSprite(sprite, x, y, flip) {
    if (!isDrawableImage(sprite)) {
      return false;
    }
    if (!flip) {
      return safeDrawImage(sprite, Math.round(x), Math.round(y));
    }
    ctx.save();
    ctx.translate(Math.round(x) + sprite.width, Math.round(y));
    ctx.scale(-1, 1);
    const drew = safeDrawImage(sprite, 0, 0);
    ctx.restore();
    return drew;
  }

  function drawGeneratedFrame(image, sx, sy, sw, sh, dx, dy, dw, dh, flip) {
    if (!isDrawableImage(image)) {
      return false;
    }
    const x = Math.round(dx);
    const y = Math.round(dy);
    const w = Math.round(dw);
    const h = Math.round(dh);
    if (!flip) {
      return safeDrawImage(image, sx, sy, sw, sh, x, y, w, h);
    }
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    const drew = safeDrawImage(image, sx, sy, sw, sh, 0, 0, w, h);
    ctx.restore();
    return drew;
  }

  function isDrawableImage(image) {
    if (!image) {
      return false;
    }
    if (image instanceof HTMLImageElement) {
      return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    }
    if (image instanceof HTMLCanvasElement) {
      return image.width > 0 && image.height > 0;
    }
    return false;
  }

  function safeDrawImage(image, ...args) {
    try {
      ctx.drawImage(image, ...args);
      return true;
    } catch (error) {
      return false;
    }
  }

  function rect(targetCtx, x, y, w, h, color) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function getPlayerBox() {
    const player = state.player;
    return { x: player.x, y: player.y, w: player.w, h: player.h };
  }

  function getAttackBox() {
    const player = state.player;
    if (player.attack <= 0) {
      return null;
    }
    if (player.facing > 0) {
      return { x: player.x + player.w - 1, y: player.y + 15, w: 34, h: 22 };
    }
    return { x: player.x - 33, y: player.y + 15, w: 34, h: 22 };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function isHazardActive(hazard) {
    return ((state.elapsed + hazard.phase) % 2.4) > 1.36;
  }

  function approach(value, target, amount) {
    if (value < target) {
      return Math.min(value + amount, target);
    }
    return Math.max(value - amount, target);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function wrap(value, min, max) {
    const range = max - min;
    return ((((value - min) % range) + range) % range) + min;
  }

  function hash(value) {
    const x = Math.sin(value * 127.1) * 43758.5453123;
    return x - Math.floor(x);
  }

  function tileColor(tile, row) {
    const n = hash(tile * 17 + row * 41);
    if (n < 0.32) return "#a77648";
    if (n < 0.64) return palettes.brick;
    if (n < 0.84) return "#bd8752";
    return "#6f4a31";
  }

  function iColor(i) {
    return i % 2 ? "#e7e37a" : "#e48ac6";
  }

  function padScore(score, size) {
    return String(Math.max(0, Math.floor(score))).padStart(size, "0");
  }

  function formatTime(time) {
    const totalCentiseconds = Math.max(0, Math.floor(time * 100));
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = totalCentiseconds % 100;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + "." + String(centiseconds).padStart(2, "0");
  }
})();
