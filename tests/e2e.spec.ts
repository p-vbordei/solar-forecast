import { test, expect } from '@playwright/test';

test.describe('Solar Forecast Platform E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Dashboard page loads correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Solar Forecast Platform/);
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Solar Energy Dashboard');
    
    // Check metric cards are visible
    const metricCards = page.locator('.card-glass');
    await expect(metricCards).toHaveCount(4);
    
    // Check navigation is present
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('Navigation works correctly', async ({ page }) => {
    // Test navigation to Locations
    await page.click('text=Locations');
    await expect(page).toHaveURL('/locations');
    await expect(page.locator('h1')).toContainText('Locations');
    
    // Test navigation to Forecast
    await page.click('text=Forecast');
    await expect(page).toHaveURL('/forecast');
    await expect(page.locator('h1')).toContainText('Forecast Generation');
    
    // Test navigation to Analysis
    await page.click('text=Analysis');
    await expect(page).toHaveURL('/analysis');
    await expect(page.locator('h1')).toContainText('Performance Analysis');
    
    // Test navigation to Alerts
    await page.click('text=Alerts');
    await expect(page).toHaveURL('/alerts');
    await expect(page.locator('h1')).toContainText('Alerts Management');
    
    // Test navigation to Reports
    await page.click('text=Reports');
    await expect(page).toHaveURL('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('Locations page functionality', async ({ page }) => {
    await page.goto('/locations');
    
    // Check locations grid is displayed
    const locationCards = page.locator('.card-glass');
    const count = await locationCards.count();
    expect(count).toBeGreaterThan(0);
    
    // Check Add Location button exists
    const addButton = page.locator('button:has-text("Add Location")');
    await expect(addButton).toBeVisible();
    
    // Check filter dropdowns exist
    const filters = page.locator('select');
    await expect(filters).toHaveCount(2);
    
    // Check search input exists
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
  });

  test('Forecast generation workflow', async ({ page }) => {
    await page.goto('/forecast');
    
    // Check configuration panel exists
    const configPanel = page.locator('.card-glass').first();
    await expect(configPanel).toBeVisible();
    
    // Check location dropdown
    const locationSelect = page.locator('select').first();
    await expect(locationSelect).toBeVisible();
    
    // Check horizon dropdown
    const horizonSelect = page.locator('select').nth(1);
    await expect(horizonSelect).toBeVisible();
    
    // Check model type dropdown
    const modelSelect = page.locator('select').nth(2);
    await expect(modelSelect).toBeVisible();
    
    // Check Generate Forecast button
    const generateButton = page.locator('button:has-text("Generate Forecast")');
    await expect(generateButton).toBeVisible();
    
    // Test forecast generation
    await generateButton.click();
    
    // Check for generating state
    await expect(generateButton).toContainText('Generating...');
    
    // Wait for completion (mock takes 2 seconds)
    await page.waitForTimeout(2500);
    
    // Check success message appears
    const successMessage = page.locator('text=Forecast Generated Successfully');
    await expect(successMessage).toBeVisible();
  });

  test('Analysis page displays metrics', async ({ page }) => {
    await page.goto('/analysis');
    
    // Check metric cards
    const metricCards = page.locator('.card-glass');
    const count = await metricCards.count();
    expect(count).toBeGreaterThan(3);
    
    // Check Run Analysis button
    const analyzeButton = page.locator('button:has-text("Run Analysis")');
    await expect(analyzeButton).toBeVisible();
    
    // Check time period selector
    const periodSelect = page.locator('select').first();
    await expect(periodSelect).toBeVisible();
    
    // Check analysis type selector
    const typeSelect = page.locator('select').nth(2);
    await expect(typeSelect).toBeVisible();
    
    // Check performance comparison table
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('Alerts management functionality', async ({ page }) => {
    await page.goto('/alerts');
    
    // Check alert statistics cards
    const statsCards = page.locator('.card-glass').first().locator('.card-glass');
    await expect(statsCards).toHaveCount(4);
    
    // Check filter dropdowns
    const typeFilter = page.locator('select').first();
    await expect(typeFilter).toBeVisible();
    
    const statusFilter = page.locator('select').nth(1);
    await expect(statusFilter).toBeVisible();
    
    // Check alerts list
    const alertsList = page.locator('.card-glass.border-l-4');
    const alertCount = await alertsList.count();
    expect(alertCount).toBeGreaterThan(0);
    
    // Check alert rules table
    const rulesTable = page.locator('table');
    await expect(rulesTable).toBeVisible();
  });

  test('Reports generation and management', async ({ page }) => {
    await page.goto('/reports');
    
    // Check report type selection
    const reportTypes = page.locator('button').filter({ hasText: /Production Report|Performance Analysis|Financial Summary/ });
    const typeCount = await reportTypes.count();
    expect(typeCount).toBeGreaterThan(0);
    
    // Select a report type
    await page.click('text=Production Report');
    
    // Check date range selector
    const dateRange = page.locator('select').filter({ hasText: /Last 30 Days/ });
    await expect(dateRange.first()).toBeVisible();
    
    // Check Generate Report button
    const generateButton = page.locator('button:has-text("Generate Report")');
    await expect(generateButton).toBeVisible();
    
    // Test report generation
    await generateButton.click();
    
    // Check generating state
    await expect(generateButton).toContainText('Generating Report...');
    
    // Wait for completion
    await page.waitForTimeout(2500);
    
    // Check success message
    const successMessage = page.locator('text=Report Generated Successfully');
    await expect(successMessage).toBeVisible();
    
    // Check recent reports table
    const reportsTable = page.locator('table');
    await expect(reportsTable).toBeVisible();
  });

  test('Dark theme is applied correctly', async ({ page }) => {
    // Check background color
    const body = page.locator('body');
    const backgroundColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should be dark petrol color
    expect(backgroundColor).toMatch(/rgb\(0, 49, 53\)|#003135/);
    
    // Check text color is light
    const heading = page.locator('h1').first();
    const textColor = await heading.evaluate((el) => 
      window.getComputedStyle(el).color
    );
    
    // Should be soft blue color
    expect(textColor).toMatch(/rgb\(175, 221, 229\)|#AFDDE5/);
  });

  test('API endpoints return data', async ({ page }) => {
    // Test locations API
    const locationsResponse = await page.request.get('/api/locations');
    expect(locationsResponse.ok()).toBeTruthy();
    const locationsData = await locationsResponse.json();
    expect(locationsData.success).toBeTruthy();
    expect(Array.isArray(locationsData.data)).toBeTruthy();
    
    // Test forecast API
    const forecastResponse = await page.request.get('/api/forecast?locationId=1');
    expect(forecastResponse.ok()).toBeTruthy();
    const forecastData = await forecastResponse.json();
    expect(forecastData.success).toBeTruthy();
    
    // Test alerts API
    const alertsResponse = await page.request.get('/api/alerts');
    expect(alertsResponse.ok()).toBeTruthy();
    const alertsData = await alertsResponse.json();
    expect(alertsData.success).toBeTruthy();
    expect(Array.isArray(alertsData.data)).toBeTruthy();
    
    // Test analysis API
    const analysisResponse = await page.request.get('/api/analysis?locationId=1');
    expect(analysisResponse.ok()).toBeTruthy();
    const analysisData = await analysisResponse.json();
    expect(analysisData.success).toBeTruthy();
  });

  test('Responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check navigation is still accessible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check cards stack vertically
    const cards = page.locator('.card-glass');
    const firstCard = await cards.first().boundingBox();
    const secondCard = await cards.nth(1).boundingBox();
    
    if (firstCard && secondCard) {
      // Cards should be stacked (second card Y position is greater than first)
      expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height);
    }
  });

  test('Error handling works correctly', async ({ page }) => {
    // Test invalid location ID
    const response = await page.request.get('/api/forecast?locationId=invalid');
    const data = await response.json();
    expect(data.success).toBeFalsy();
    expect(data.error).toBeTruthy();
  });
});

test.describe('Integration Tests', () => {
  test('Frontend connects to backend APIs', async ({ page }) => {
    await page.goto('/locations');
    
    // Wait for locations to load
    await page.waitForSelector('.card-glass', { timeout: 5000 });
    
    // Check that location cards are populated
    const locationNames = page.locator('.card-glass h3');
    const count = await locationNames.count();
    expect(count).toBeGreaterThan(0);
    
    // Check first location has expected structure
    const firstLocation = locationNames.first();
    await expect(firstLocation).toBeVisible();
    const text = await firstLocation.textContent();
    expect(text).toBeTruthy();
  });

  test('Real-time updates simulation', async ({ page }) => {
    await page.goto('/');
    
    // Check that production chart updates
    const chart = page.locator('[data-testid="production-chart"]');
    await expect(chart).toBeVisible();
    
    // Check alerts panel updates
    const alertsPanel = page.locator('[data-testid="alerts-panel"]');
    await expect(alertsPanel).toBeVisible();
  });
});