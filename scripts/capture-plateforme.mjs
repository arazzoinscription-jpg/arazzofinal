// Capture de captures d'écran réelles de la plateforme (espace connecté) pour la section /offre.
// Utilise le Chrome système via puppeteer-core. Lancer le dev server (port 3000) avant.
// node scripts/capture-plateforme.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "images", "plateforme");
mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";
const EMAIL = process.env.CAP_EMAIL;
const PWD = process.env.CAP_PWD;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function autoScroll(page, step = 600, pause = 250) {
  await page.evaluate(async (step, pause) => {
    await new Promise((resolve) => {
      let y = 0;
      const h = document.body.scrollHeight;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= h) { clearInterval(timer); resolve(); }
      }, pause);
    });
  }, step, pause);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();

  // ---- Login ----
  console.log("→ login");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.type('input[type="email"]', EMAIL, { delay: 20 });
  await page.type('input[type="password"]', PWD, { delay: 20 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {}),
    page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /se connecter/i.test(x.textContent));
      b && b.click();
    }),
  ]);
  await sleep(3000);
  console.log("  url:", page.url());

  // Découvrir l'id du cours suivi
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await sleep(2500);
  const courseHref = await page.evaluate(() => {
    const a = document.querySelector('a[href*="/dashboard/cours/"]');
    return a ? a.getAttribute("href") : null;
  });
  console.log("  course:", courseHref);

  const shots = [];
  const desktop = { width: 1440, height: 960, deviceScaleFactor: 2 };
  const phone = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

  async function shot(name, url, viewport, { full = false, wait = 3200, scroll = false } = {}) {
    try {
      await page.setViewport(viewport);
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await sleep(wait);
      if (scroll) await autoScroll(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      const file = join(OUT, `${name}.png`);
      await page.screenshot({ path: file, fullPage: full });
      console.log("  ✓", name, "←", url);
      shots.push({ name, url, ok: true });
    } catch (e) {
      console.log("  ✗", name, e.message);
      shots.push({ name, url, ok: false, err: e.message });
    }
  }

  // ---- Captures ----
  await shot("dashboard-eleve", "/dashboard", desktop, { wait: 4000 });
  await shot("dashboard-eleve-full", "/dashboard", desktop, { full: true, scroll: true, wait: 3500 });
  if (courseHref) {
    await shot("cours-lecon", courseHref, desktop, { wait: 4500 });
    await shot("cours-lecon-full", courseHref, desktop, { full: true, scroll: true, wait: 4500 });
  }
  await shot("feed-communaute", "/communaute", phone, { wait: 5000 });
  await shot("formateur", "/formateur", desktop, { wait: 4000 });
  await shot("formateur-full", "/formateur", desktop, { full: true, scroll: true, wait: 4000 });

  console.log(JSON.stringify(shots, null, 2));
  await browser.close();
})();
