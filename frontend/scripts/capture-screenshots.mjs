import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.resolve(frontendRoot, '..', 'docs', 'screenshots');
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3000';

const browser = await chromium.launch();

async function capturePublicPages() {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktop.getByRole('heading', { name: 'Start with what you need.' }).waitFor();
  await desktop.screenshot({
    path: path.join(outputDirectory, 'public-home-desktop.png'),
    fullPage: true,
  });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${baseUrl}/book`, { waitUntil: 'domcontentloaded' });
  await mobile.getByRole('button', { name: /Annual Checkup/ }).waitFor();
  await mobile.screenshot({
    path: path.join(outputDirectory, 'booking-flow-mobile.png'),
    fullPage: true,
  });

  await desktop.close();
  await mobile.close();
}

async function loginAs(page, roleName) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: roleName }).click();
  await page.waitForURL(/\/dashboard\//);
}

async function captureAdminPages() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await loginAs(page, /Admin Operations/);
  await page.getByRole('heading', { name: 'Clinic overview' }).waitFor();
  await page.screenshot({
    path: path.join(outputDirectory, 'admin-crm-dashboard.png'),
    fullPage: true,
  });

  await page.goto(`${baseUrl}/dashboard/admin/patients`, { waitUntil: 'domcontentloaded' });
  const patientLink = page.locator('main a[href^="/dashboard/admin/patients/"]').first();
  await patientLink.waitFor();
  await patientLink.click();
  await page.waitForURL(/\/dashboard\/admin\/patients\//);
  await page.locator('#follow-up').waitFor();
  await page.screenshot({
    path: path.join(outputDirectory, 'patient-crm-record.png'),
    fullPage: true,
  });
  await context.close();
}

async function captureDoctorPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await loginAs(page, /Doctor Today’s visits/);
  await page.goto(`${baseUrl}/dashboard/doctor/upcoming`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Upcoming visits' }).waitFor();
  await page.screenshot({
    path: path.join(outputDirectory, 'doctor-dashboard.png'),
    fullPage: true,
  });
  await context.close();
}

try {
  await capturePublicPages();
  await captureAdminPages();
  await captureDoctorPage();
  console.log(`Screenshots saved to ${outputDirectory}`);
} finally {
  await browser.close();
}
