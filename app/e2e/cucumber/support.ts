import {
    After,
    AfterAll,
    Before,
    BeforeAll,
    setDefaultTimeout,
    setWorldConstructor,
    World,
} from '@cucumber/cucumber';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

const appUrl = 'http://127.0.0.1:5174';
let browser: Browser;
let vite: ViteDevServer;

setDefaultTimeout(15_000);

class AppWorld extends World {
    page!: Page;
}

setWorldConstructor(AppWorld);

BeforeAll(async () => {
    process.env.VITE_SERVER_API = 'http://localhost:8000';
    vite = await createServer({
        server: { host: '127.0.0.1', port: 5174, strictPort: true },
    });
    await vite.listen();
    browser = await chromium.launch();
});

Before(async function () {
    this.page = await browser.newPage();
});

After(async function () {
    await this.page.close();
});

AfterAll(async () => {
    await browser?.close();
    await vite?.close();
});

export { appUrl, AppWorld };