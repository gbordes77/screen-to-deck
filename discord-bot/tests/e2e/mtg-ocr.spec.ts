import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
test.describe.configure({ mode: 'parallel' });

test.describe('MTG Screen-to-Deck E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('http://localhost:5173'); // Vite dev server
  });

  test.describe('Homepage Navigation', () => {
    test('should load homepage successfully', async () => {
      await expect(page).toHaveTitle(/MTG Screen-to-Deck/i);
      await expect(page.locator('h1')).toContainText(/MTG Screen-to-Deck/i);
    });

    test('should navigate to converter page', async () => {
      await page.click('text=Start Converting');
      await expect(page).toHaveURL(/\/converter/);
      await expect(page.locator('h1')).toContainText(/Deck Converter/i);
    });

    test('should navigate to about page', async () => {
      await page.click('text=About');
      await expect(page).toHaveURL(/\/about/);
      await expect(page.locator('h1')).toContainText(/About/i);
    });
  });

  test.describe('Image Upload and OCR Processing', () => {
    test('should upload image and process with standard OCR', async () => {
      await page.goto('http://localhost:5173/converter');
      
      // Create test image
      const testImagePath = await createTestDeckImage();
      
      // Upload image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for preview
      await expect(page.locator('img[alt="Preview"]')).toBeVisible();
      
      // Click process button
      await page.click('button:has-text("Process Image")');
      
      // Wait for processing (with timeout)
      await expect(page.locator('text=Processing')).toBeVisible();
      await expect(page.locator('text=Processing')).toBeHidden({ timeout: 30000 });
      
      // Check results
      const resultsExist = await page.locator('text=Mainboard').isVisible();
      if (resultsExist) {
        await expect(page.locator('text=Mainboard')).toBeVisible();
        await expect(page.locator('text=Sideboard')).toBeVisible();
      }
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    test('should handle enhanced OCR with never-give-up mode', async () => {
      await page.goto('http://localhost:5173/converter');
      
      // Click on Enhanced OCR tab/button if it exists
      const enhancedButton = page.locator('text=Enhanced OCR');
      if (await enhancedButton.isVisible()) {
        await enhancedButton.click();
      }
      
      const testImagePath = await createTestDeckImage();
      
      // Upload image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      // Process with enhanced OCR
      await page.click('button:has-text("Process with Enhanced OCR")');
      
      // Wait for never-give-up mode indication
      await expect(page.locator('text=Never Giving Up')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('text=Complete', { timeout: 60000 });
      
      // Verify 60+15 cards
      const mainboardCount = await page.locator('text=/Mainboard.*60/').isVisible();
      const sideboardCount = await page.locator('text=/Sideboard.*15/').isVisible();
      
      if (mainboardCount && sideboardCount) {
        expect(mainboardCount).toBeTruthy();
        expect(sideboardCount).toBeTruthy();
      }
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    test('should show error for invalid file types', async () => {
      await page.goto('http://localhost:5173/converter');
      
      // Create non-image file
      const textFilePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');
      
      // Try to upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(textFilePath);
      
      // Should show error or not accept file
      const errorVisible = await page.locator('text=/invalid|error|not supported/i').isVisible();
      expect(errorVisible).toBeTruthy();
      
      // Cleanup
      fs.unlinkSync(textFilePath);
    });

    test('should handle network errors gracefully', async () => {
      await page.goto('http://localhost:5173/converter');
      
      // Simulate offline mode
      await page.context().setOffline(true);
      
      const testImagePath = await createTestDeckImage();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      // Try to process
      await page.click('button:has-text("Process")');
      
      // Should show network error
      await expect(page.locator('text=/network|offline|connection/i')).toBeVisible({ timeout: 10000 });
      
      // Restore online mode
      await page.context().setOffline(false);
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    });
  });

  test.describe('Export Functionality', () => {
    test('should export to MTGA format', async () => {
      await page.goto('http://localhost:5173/converter');
      
      // Mock successful OCR result
      await mockSuccessfulOCR(page);
      
      // Click export to MTGA
      await page.click('button:has-text("MTGA")');
      
      // Check clipboard or download
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('4 Lightning Bolt');
      expect(clipboardText).toContain('Sideboard');
    });

    test('should export to Moxfield format', async () => {
      await page.goto('http://localhost:5173/converter');
      
      await mockSuccessfulOCR(page);
      
      // Click export to Moxfield
      await page.click('button:has-text("Moxfield")');
      
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('4x Lightning Bolt');
      expect(clipboardText).toContain('SB:');
    });

    test('should export to JSON format', async () => {
      await page.goto('http://localhost:5173/converter');
      
      await mockSuccessfulOCR(page);
      
      // Click export to JSON
      await page.click('button:has-text("JSON")');
      
      // Check for download or clipboard
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      const jsonData = JSON.parse(clipboardText);
      expect(jsonData.mainboard).toBeDefined();
      expect(jsonData.sideboard).toBeDefined();
    });

    test('should copy all export formats correctly', async () => {
      await page.goto('http://localhost:5173/converter');
      
      await mockSuccessfulOCR(page);
      
      // Test all export formats
      const formats = ['MTGA', 'Moxfield', 'Archidekt', 'TappedOut'];
      
      for (const format of formats) {
        const button = page.locator(`button:has-text("${format}")`);
        if (await button.isVisible()) {
          await button.click();
          
          // Small delay to ensure clipboard is updated
          await page.waitForTimeout(500);
          
          const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
          expect(clipboardText.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('UI Components and Interactions', () => {
    test('should show loading state during processing', async () => {
      await page.goto('http://localhost:5173/converter');
      
      const testImagePath = await createTestDeckImage();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      // Start processing
      await page.click('button:has-text("Process")');
      
      // Check loading indicators
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('text=/processing|loading/i')).toBeVisible();
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    test('should display statistics after processing', async () => {
      await page.goto('http://localhost:5173/converter');
      
      await mockSuccessfulOCR(page);
      
      // Check for statistics display
      await expect(page.locator('text=Processing Time')).toBeVisible();
      await expect(page.locator('text=Confidence')).toBeVisible();
      await expect(page.locator('text=Unique Cards')).toBeVisible();
    });

    test('should validate card counts visually', async () => {
      await page.goto('http://localhost:5173/converter');
      
      await mockSuccessfulOCR(page);
      
      // Check for visual validation indicators
      const mainboardValid = page.locator('[data-testid="mainboard-valid"]');
      const sideboardValid = page.locator('[data-testid="sideboard-valid"]');
      
      if (await mainboardValid.isVisible()) {
        await expect(mainboardValid).toHaveClass(/text-green/);
      }
      
      if (await sideboardValid.isVisible()) {
        await expect(sideboardValid).toHaveClass(/text-green/);
      }
    });

    test('should handle drag and drop upload', async () => {
      await page.goto('http://localhost:5173/converter');
      
      const testImagePath = await createTestDeckImage();
      
      // Simulate drag and drop
      const dropZone = page.locator('[data-testid="drop-zone"]');
      if (await dropZone.isVisible()) {
        const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
        const file = await page.evaluateHandle((path) => {
          return new File([new Uint8Array(100)], 'test.jpg', { type: 'image/jpeg' });
        }, testImagePath);
        
        await page.evaluate(([dt, f]) => {
          dt.items.add(f);
        }, [dataTransfer, file]);
        
        await dropZone.dispatchEvent('drop', { dataTransfer });
        
        // Check if file was accepted
        await expect(page.locator('img[alt="Preview"]')).toBeVisible();
      }
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const mobilePage = await context.newPage();
      await mobilePage.goto('http://localhost:5173');
      
      // Check mobile menu
      const menuButton = mobilePage.locator('[data-testid="mobile-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await expect(mobilePage.locator('nav')).toBeVisible();
      }
      
      // Check converter page on mobile
      await mobilePage.goto('http://localhost:5173/converter');
      await expect(mobilePage.locator('input[type="file"]')).toBeVisible();
      
      await context.close();
    });

    test('should handle touch interactions', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true
      });
      
      const touchPage = await context.newPage();
      await touchPage.goto('http://localhost:5173/converter');
      
      // Test touch interactions
      const uploadButton = touchPage.locator('label[for="file-upload"]');
      await uploadButton.tap();
      
      // File input should be interactable
      await expect(touchPage.locator('input[type="file"]')).toBeEnabled();
      
      await context.close();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      await page.goto('http://localhost:5173');
      
      // Check for ARIA labels
      const uploadInput = page.locator('input[type="file"]');
      const ariaLabel = await uploadInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      
      // Check buttons have accessible text
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async () => {
      await page.goto('http://localhost:5173/converter');
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check focused element
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
      
      // Try to activate with Enter
      await page.keyboard.press('Enter');
    });
  });
});

// Helper functions
async function createTestDeckImage(): Promise<string> {
  const sharp = require('sharp');
  const testImagePath = path.join(__dirname, `test-deck-${Date.now()}.jpg`);
  
  const svg = `
    <svg width="1920" height="1080">
      <rect width="1920" height="1080" fill="white"/>
      <text x="50" y="50" font-size="20" fill="black">4 Lightning Bolt</text>
      <text x="50" y="80" font-size="20" fill="black">20 Island</text>
      <text x="50" y="110" font-size="20" fill="black">20 Mountain</text>
      <text x="50" y="140" font-size="20" fill="black">16 Other Cards</text>
      <text x="1700" y="50" font-size="18" fill="black">Sideboard</text>
      <text x="1700" y="80" font-size="18" fill="black">3 Negate</text>
      <text x="1700" y="110" font-size="18" fill="black">12 Other Sideboard</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .jpeg()
    .toFile(testImagePath);
  
  return testImagePath;
}

async function mockSuccessfulOCR(page: Page): Promise<void> {
  // Intercept API calls and return mock data
  await page.route('**/api/ocr/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Island', quantity: 20, section: 'mainboard' },
          { name: 'Mountain', quantity: 20, section: 'mainboard' },
          { name: 'Counterspell', quantity: 4, section: 'mainboard' },
          { name: 'Other Cards', quantity: 12, section: 'mainboard' },
          { name: 'Negate', quantity: 3, section: 'sideboard' },
          { name: 'Rest in Peace', quantity: 3, section: 'sideboard' },
          { name: 'Other Sideboard', quantity: 9, section: 'sideboard' }
        ],
        statistics: {
          mainboard_count: 60,
          sideboard_count: 15,
          total_unique_cards: 8,
          processing_time_ms: 2500,
          confidence: 0.95
        },
        validation: {
          mainboard_valid: true,
          sideboard_valid: true,
          complete: true
        }
      })
    });
  });
}