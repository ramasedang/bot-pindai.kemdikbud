import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.setViewport({
  width: 1920,
  height: 1080,
});

await page.goto("http://127.0.0.1");
await page.screenshot({ path: "screenshot.png", fullPage: true });

await browser.close();
