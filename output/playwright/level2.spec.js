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

test("loads the Jardin des plantes second level", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("file:///E:/Dev/2d-game/index.html");
  await page.waitForFunction(() => window.__GIVROS_BUILD === "gpt-assets-20260427-14");
  await page.evaluate(() => document.getElementById("next-level-button").click());

  await expect(page.getByText("JARDIN DES PLANTES")).toBeVisible();
  await page.getByRole("button", { name: "START" }).click();
  await page.waitForTimeout(3300);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1200);
  await page.keyboard.up("ArrowRight");

  const result = await page.evaluate(() => ({
    coins: document.getElementById("coin-count").textContent,
    time: document.getElementById("time-left").textContent,
    bannerHidden: document.getElementById("status-banner").classList.contains("hidden"),
  }));
  const screenshot = await page.screenshot({ path: "output/playwright/level2-jardin.png" });

  expect(errors).toEqual([]);
  expect(screenshot.length).toBeGreaterThan(1000);
  expect(result.coins).toMatch(/^x\d{2}\/24$/);
  expect(result.time).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
  expect(result.bannerHidden).toBe(true);
});
