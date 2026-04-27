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

test("shows speedrun rules on the start panel", async ({ page }) => {
  await page.goto("file:///E:/Dev/2d-game/index.html");
  await page.waitForFunction(() => window.__GIVROS_BUILD === "gpt-assets-20260427-9");

  await expect(page.getByText("Speedrun challenge")).toBeVisible();
  await expect(page.getByText("Collect every coin")).toBeVisible();
  await expect(page.getByText("Damage penalty: +1s.")).toBeVisible();
  await expect(page.getByText("Move: Arrows / A D")).toBeVisible();
  await expect(page.getByText("Jump: Space / W / Up")).toBeVisible();
  await expect(page.getByText("Attack: J / K / X")).toHaveCount(0);

  const screenshot = await page.screenshot({ path: "output/playwright/start-rules.png" });
  expect(screenshot.length).toBeGreaterThan(1000);
});
