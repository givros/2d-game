const path = require("path");

function loadPlaywrightTest() {
  try {
    return require("@playwright/test");
  } catch (error) {
    const cliPath = process.argv.find((argument) =>
      argument.includes(`${path.sep}@playwright${path.sep}test${path.sep}cli.js`),
    );
    if (cliPath) {
      return require(path.dirname(cliPath));
    }
    const stackLine = error.stack
      .split("\n")
      .find((line) => line.includes(`${path.sep}node_modules${path.sep}playwright${path.sep}lib`));
    if (stackLine) {
      const stackPath = stackLine.match(/[A-Z]:\\.*?\\node_modules\\playwright\\lib/i)?.[0];
      const nodeModulesRoot = stackPath.slice(0, stackPath.indexOf(`${path.sep}node_modules${path.sep}playwright${path.sep}lib`) + `${path.sep}node_modules`.length);
      return require(path.join(nodeModulesRoot, "@playwright", "test"));
    }
    throw error;
  }
}

const { test, expect } = loadPlaywrightTest();

test("game renders and responds to input", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("file:///E:/Dev/2d-game/index.html");
  await page.waitForFunction(() => window.__GIVROS_BUILD === "gpt-assets-20260427-11");
  await page.getByRole("button", { name: "START" }).click();
  await page.waitForTimeout(3300);
  await page.waitForTimeout(500);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1350);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyJ");
  await page.waitForTimeout(350);

  const result = await page.evaluate(() => ({
    coins: document.getElementById("coin-count").textContent,
    time: document.getElementById("time-left").textContent,
    score: document.getElementById("score-value").textContent,
    bannerHidden: document.getElementById("status-banner").classList.contains("hidden"),
    canvasWidth: document.getElementById("game").width,
    canvasHeight: document.getElementById("game").height,
  }));

  const screenshot = await page.screenshot({ path: "output/playwright/game-after-move.png" });

  expect(errors).toEqual([]);
  expect(screenshot.length).toBeGreaterThan(1000);
  expect(result.canvasWidth).toBe(768);
  expect(result.canvasHeight).toBe(432);
  expect(result.coins).toMatch(/^x\d{2}\/24$/);
  expect(result.coins).not.toBe("x00/24");
  expect(result.time).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
  expect(result.score).not.toBe("0000000");
  expect(result.bannerHidden).toBe(true);
});
