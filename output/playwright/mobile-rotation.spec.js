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

test.use({
  viewport: { width: 932, height: 430 },
  isMobile: true,
  hasTouch: true,
});

test("stays pinned after repeated mobile rotations", async ({ page }) => {
  await page.goto("file:///E:/Dev/2d-game/index.html");
  await page.waitForFunction(() => window.__GIVROS_BUILD === "gpt-assets-20260427-10");

  for (const size of [
    { width: 430, height: 932 },
    { width: 932, height: 430 },
    { width: 430, height: 932 },
    { width: 932, height: 430 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(450);
    const shell = await page.evaluate(() => {
      const rect = document.getElementById("game-shell").getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY),
      };
    });
    expect(shell.left).toBe(0);
    expect(shell.top).toBe(0);
    expect(shell.width).toBe(size.width);
    expect(shell.height).toBe(size.height);
    expect(shell.scrollX).toBe(0);
    expect(shell.scrollY).toBe(0);
  }

  const screenshot = await page.screenshot({ path: "output/playwright/mobile-rotation-final.png" });
  expect(screenshot.length).toBeGreaterThan(1000);
});
