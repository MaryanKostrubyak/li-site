import { expect, test, type Page } from '@playwright/test';

function futureClinicWeekday(daysAhead = 1): string {
  const candidate = new Date();
  candidate.setUTCHours(20, 0, 0, 0);
  candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
  while (['Saturday', 'Sunday'].includes(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
  }).format(candidate))) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(candidate);
}

async function demoLogin(page: Page, roleName: RegExp) {
  await page.goto('/login');
  await page.getByRole('button', { name: roleName }).click();
  await expect(page).toHaveURL(/\/dashboard\//);
}

async function chooseConsultation(page: Page, daysAhead = 1) {
  await page.getByRole('button', { name: /General Consultation/ }).click();
  await page.getByRole('button', { name: /Dr. Amelia Smith/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByLabel('Clinic date').fill(futureClinicWeekday(daysAhead));
  await page.locator('main button[aria-pressed]').filter({ hasText: /AM|PM/ }).first().click();
  await page.getByRole('button', { name: /Continue/ }).click();
}

test('new patient completes the four-step booking journey', async ({ page }) => {
  await page.goto('/book');
  await chooseConsultation(page);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Portfolio Visitor');
  await page.getByLabel('Email').fill(`visitor-${Date.now()}@aetherclinic.test`);
  await page.getByLabel('Password').fill('PortfolioPass123!');
  await page.getByRole('button', { name: /Create account and continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Review and confirm.' })).toBeVisible();
  await page.getByLabel('Reason for visit').fill('A recurring headache that I would like to discuss.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Confirm appointment/ }).click();
  await expect(page.getByText(/Reference AET-/)).toBeVisible();
});

test('returning patient books without entering credentials again', async ({ page }) => {
  await demoLogin(page, /Patient Appointments/);
  await page.goto('/book');
  await chooseConsultation(page, 2);
  await expect(page.getByRole('heading', { name: 'Your account is ready.' })).toBeVisible();
  await expect(page.getByText('emily@aetherclinic.test')).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByLabel('Reason for visit').fill('Returning patient booking journey.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Confirm appointment/ }).click();
  await expect(page.getByText(/Reference AET-/)).toBeVisible();
});

test('admin creates a compatible slot-based appointment and advances a valid status', async ({ page }) => {
  await demoLogin(page, /Admin Operations/);
  await page.goto('/dashboard/admin/appointments/new');
  await page.getByLabel('Patient').selectOption({ label: 'Daniel Lee — daniel@aetherclinic.test' });
  await page.getByLabel('Service').selectOption({ label: 'Cardiology Follow-Up' });
  await page.getByLabel('Doctor').selectOption({ label: 'Dr. Farid Khan' });
  await page.getByLabel('Clinic date').fill(futureClinicWeekday(8));
  await page.locator('button[aria-pressed]').first().click();
  const reason = `Admin E2E workflow ${Date.now()}`;
  await page.getByLabel('Visit reason').fill(reason);
  await page.getByRole('button', { name: 'Create appointment' }).click();
  await expect(page.getByText('Appointment created.')).toBeVisible();

  await page.goto('/dashboard/admin/appointments');
  const newDanielVisit = page.locator('tr').filter({ hasText: 'Daniel Lee' }).filter({ hasText: 'New' });
  await expect(newDanielVisit).toHaveCount(1);
  await newDanielVisit.getByRole('combobox').selectOption('confirmed');
  await expect(page.locator('tr').filter({ hasText: 'Daniel Lee' }).filter({ hasText: 'Confirmed' })).toHaveCount(2);
});

test('patient reschedules through availability and then cancels', async ({ page }) => {
  await demoLogin(page, /Patient Appointments/);
  await page.getByRole('button', { name: 'Choose a new time' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Reschedule through availability' })).toBeVisible();
  await page.getByLabel('Clinic date').fill(futureClinicWeekday(15));
  const dialog = page.getByRole('dialog', { name: 'Reschedule through availability' });
  await dialog.locator('button[aria-pressed]').first().click();
  await dialog.getByRole('button', { name: 'Confirm new time' }).click();
  await expect(page.getByText('Appointment moved. Your previous time remains in history.')).toBeAttached();
  const movedVisit = page.locator('article').filter({ hasText: 'Returning patient booking journey.' });
  await movedVisit.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Appointment canceled.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Visit history' }).or(page.getByRole('heading', { name: 'History' }))).toBeVisible();
});

test('doctor previews and saves a note before completing a visit', async ({ page }) => {
  await demoLogin(page, /Doctor Today’s visits/);
  await page.goto('/dashboard/doctor/upcoming');
  const visit = page.locator('article').filter({ hasText: 'Recurring headaches and fatigue over the last week.' });
  await visit.getByRole('button', { name: 'Open' }).click();
  await page.getByLabel('Draft note').fill('Patient is stable and will continue the agreed care plan.');
  await page.getByRole('button', { name: 'Improve wording' }).click();
  await expect(page.getByText('Preview')).toBeVisible();
  await page.getByRole('button', { name: 'Save this note' }).click();
  await expect(page.locator('article').filter({ hasText: 'Structured note:' }).filter({ hasText: 'Patient is stable' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark completed' }).click();
  await expect(page.getByText('Completed')).toBeVisible();
});

test('patient cannot open an admin route', async ({ page }) => {
  await demoLogin(page, /Patient Appointments/);
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/dashboard\/patient$/);
  await expect(page.getByRole('heading', { name: 'Your appointments' })).toBeVisible();
});

test('demo roles open their correct portal', async ({ page }) => {
  await demoLogin(page, /Admin Operations/);
  await expect(page).toHaveURL(/dashboard\/admin/);
  await expect(page.getByRole('heading', { name: 'Clinic overview' })).toBeVisible();
});
