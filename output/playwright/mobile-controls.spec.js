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

test("mobile controls are visible and drive the player", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("file:///E:/Dev/2d-game/index.html");
  await page.waitForFunction(() => window.__GIVROS_BUILD === "gpt-assets-20260427-14");

  await expect(page.getByRole("button", { name: "Move left" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move right" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jump" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Action" })).toHaveCount(0);

  await page.getByRole("button", { name: "START" }).tap();
  await page.waitForTimeout(3300);

  const right = page.getByRole("button", { name: "Move right" });
  const rightBox = await right.boundingBox();
  expect(rightBox).not.toBeNull();
  await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();

  await page.getByRole("button", { name: "Jump" }).tap();
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => ({
    coins: document.getElementById("coin-count").textContent,
    time: document.getElementById("time-left").textContent,
    bannerHidden: document.getElementById("status-banner").classList.contains("hidden"),
    shell: {
      left: Math.round(document.getElementById("game-shell").getBoundingClientRect().left),
      top: Math.round(document.getElementById("game-shell").getBoundingClientRect().top),
      width: Math.round(document.getElementById("game-shell").getBoundingClientRect().width),
      height: Math.round(document.getElementById("game-shell").getBoundingClientRect().height),
    },
  }));
  const screenshot = await page.screenshot({ path: "output/playwright/mobile-controls.png" });

  expect(errors).toEqual([]);
  expect(screenshot.length).toBeGreaterThan(1000);
  expect(result.coins).toMatch(/^x\d{2}\/24$/);
  expect(result.time).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
  expect(result.bannerHidden).toBe(true);
  expect(result.shell.left).toBe(0);
  expect(result.shell.top).toBe(0);
  expect(result.shell.width).toBe(932);
  expect(result.shell.height).toBe(430);
});
