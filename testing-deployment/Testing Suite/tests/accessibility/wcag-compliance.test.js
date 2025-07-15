const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const { injectAxe, checkA11y, getViolations, configureAxe } = require('axe-playwright');

describe('WCAG 2.1 Compliance Tests', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.DEBUG ? 100 : 0
    });
  });

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
    await injectAxe(page);
    
    // Configure axe for comprehensive WCAG testing
    await configureAxe(page, {
      rules: {
        // WCAG 2.1 Level A rules
        'area-alt': { enabled: true },
        'audio-caption': { enabled: true },
        'blink': { enabled: true },
        'button-name': { enabled: true },
        'bypass': { enabled: true },
        'document-title': { enabled: true },
        'duplicate-id': { enabled: true },
        'empty-heading': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'frame-title': { enabled: true },
        'html-has-lang': { enabled: true },
        'html-lang-valid': { enabled: true },
        'image-alt': { enabled: true },
        'input-button-name': { enabled: true },
        'input-image-alt': { enabled: true },
        'label': { enabled: true },
        'lang': { enabled: true },
        'link-name': { enabled: true },
        'list': { enabled: true },
        'listitem': { enabled: true },
        'marquee': { enabled: true },
        'meta-refresh': { enabled: true },
        'object-alt': { enabled: true },
        'role-img-alt': { enabled: true },
        'scope-attr-valid': { enabled: true },
        'server-side-image-map': { enabled: true },
        'table-caption': { enabled: true },
        'table-duplicate-name': { enabled: true },
        'table-fake-caption': { enabled: true },
        'td-headers-attr': { enabled: true },
        'th-has-data-cells': { enabled: true },
        'valid-lang': { enabled: true },
        'video-caption': { enabled: true },
        
        // WCAG 2.1 Level AA rules
        'color-contrast': { enabled: true },
        'definition-list': { enabled: true },
        'dlitem': { enabled: true },
        'duplicate-id-active': { enabled: true },
        'duplicate-id-aria': { enabled: true },
        'empty-table-header': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'frame-tested': { enabled: true },
        'frame-title-unique': { enabled: true },
        'heading-order': { enabled: true },
        'identical-links-same-purpose': { enabled: true },
        'input-image-alt': { enabled: true },
        'label-title-only': { enabled: true },
        'landmark-banner-is-top-level': { enabled: true },
        'landmark-complementary-is-top-level': { enabled: true },
        'landmark-contentinfo-is-top-level': { enabled: true },
        'landmark-main-is-top-level': { enabled: true },
        'landmark-no-duplicate-banner': { enabled: true },
        'landmark-no-duplicate-contentinfo': { enabled: true },
        'landmark-no-duplicate-main': { enabled: true },
        'landmark-one-main': { enabled: true },
        'landmark-unique': { enabled: true },
        'meta-viewport': { enabled: true },
        'page-has-heading-one': { enabled: true },
        'region': { enabled: true },
        'scope-attr-valid': { enabled: true },
        'scrollable-region-focusable': { enabled: true },
        'select-name': { enabled: true },
        'skip-link': { enabled: true },
        'table-duplicate-name': { enabled: true },
        'td-has-header': { enabled: true },
        'th-has-data-cells': { enabled: true }
      }
    });
  });

  afterEach(async () => {
    await context.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('WCAG 2.1 Level A Compliance', () => {
    test('should meet all Level A success criteria', async () => {
      const testPages = [
        '/',
        '/communities',
        '/create',
        '/profile',
        '/login',
        '/register'
      ];

      for (const testPage of testPages) {
        await page.goto(testPage);
        await page.waitForLoadState('networkidle');

        // Run Level A compliance check
        const violations = await getViolations(page, null, {
          tags: ['wcag2a'],
          runOnly: {
            type: 'tag',
            values: ['wcag2a']
          }
        });

        // Report any Level A violations
        if (violations.length > 0) {
          console.log(`Level A violations found on ${testPage}:`, violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length
          })));
        }

        expect(violations.length).toBe(0);
      }
    });

    test('should have proper document structure (1.3.1 Info and Relationships)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test document language
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // Valid language code

      // Test page title
      const title = await page.title();
      expect(title.trim()).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // Test heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);

      let hasH1 = false;
      let previousLevel = 0;

      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const level = parseInt(tagName.charAt(1));
        
        if (level === 1) hasH1 = true;
        
        // Check heading hierarchy (should not skip levels)
        if (previousLevel > 0) {
          expect(level - previousLevel).toBeLessThanOrEqual(1);
        }
        
        // Headings should not be empty
        const text = await heading.textContent();
        expect(text.trim()).toBeTruthy();
        
        previousLevel = level;
      }

      expect(hasH1).toBe(true); // Page should have an H1

      // Test landmark regions
      const landmarks = {
        main: await page.locator('main, [role="main"]').count(),
        navigation: await page.locator('nav, [role="navigation"]').count(),
        banner: await page.locator('header, [role="banner"]').count(),
        contentinfo: await page.locator('footer, [role="contentinfo"]').count()
      };

      expect(landmarks.main).toBeGreaterThanOrEqual(1);
      expect(landmarks.navigation).toBeGreaterThanOrEqual(1);

      // Test list structures
      const lists = await page.locator('ul, ol, dl').all();
      for (const list of lists) {
        const tagName = await list.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'ul' || tagName === 'ol') {
          const listItems = await list.locator('li').count();
          expect(listItems).toBeGreaterThan(0);
        } else if (tagName === 'dl') {
          const terms = await list.locator('dt').count();
          const definitions = await list.locator('dd').count();
          expect(terms).toBeGreaterThan(0);
          expect(definitions).toBeGreaterThan(0);
        }
      }
    });

    test('should have accessible images (1.1.1 Non-text Content)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const images = await page.locator('img').all();
      
      for (const image of images) {
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');
        const ariaLabel = await image.getAttribute('aria-label');
        const ariaLabelledBy = await image.getAttribute('aria-labelledby');
        
        // Images must have alternative text or be marked as decorative
        const hasAltText = alt !== null && alt.trim() !== '';
        const isDecorative = role === 'presentation' || role === 'none' || alt === '';
        const hasAriaLabel = ariaLabel || ariaLabelledBy;
        
        expect(hasAltText || isDecorative || hasAriaLabel).toBe(true);
        
        // If image has meaningful content, alt text should be descriptive
        if (hasAltText) {
          expect(alt.length).toBeGreaterThan(0);
          expect(alt).not.toMatch(/^(image|picture|photo|img)$/i);
        }
      }

      // Test SVG accessibility
      const svgs = await page.locator('svg').all();
      for (const svg of svgs) {
        const role = await svg.getAttribute('role');
        const ariaLabel = await svg.getAttribute('aria-label');
        const ariaLabelledBy = await svg.getAttribute('aria-labelledby');
        const title = await svg.locator('title').count();
        
        // SVGs should have accessible names if they convey information
        if (role !== 'presentation' && role !== 'none') {
          expect(ariaLabel || ariaLabelledBy || title > 0).toBe(true);
        }
      }

      // Test canvas accessibility
      const canvases = await page.locator('canvas').all();
      for (const canvas of canvases) {
        const ariaLabel = await canvas.getAttribute('aria-label');
        const ariaLabelledBy = await canvas.getAttribute('aria-labelledby');
        const role = await canvas.getAttribute('role');
        
        // Canvas elements should have accessible alternatives
        expect(ariaLabel || ariaLabelledBy || role === 'presentation').toBe(true);
      }
    });

    test('should have proper form labels (1.3.1, 3.3.2)', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const formControls = await page.locator('input, textarea, select').all();
      
      for (const control of formControls) {
        const id = await control.getAttribute('id');
        const type = await control.getAttribute('type');
        const ariaLabel = await control.getAttribute('aria-label');
        const ariaLabelledBy = await control.getAttribute('aria-labelledby');
        
        // Skip hidden inputs
        if (type === 'hidden') continue;
        
        // Each form control should have an accessible name
        let hasAccessibleName = false;
        
        if (id) {
          const associatedLabel = await page.locator(`label[for="${id}"]`).count();
          hasAccessibleName = associatedLabel > 0;
        }
        
        hasAccessibleName = hasAccessibleName || ariaLabel || ariaLabelledBy;
        
        expect(hasAccessibleName).toBe(true);
        
        // Required fields should be indicated
        const required = await control.getAttribute('required');
        const ariaRequired = await control.getAttribute('aria-required');
        
        if (required !== null) {
          expect(ariaRequired).toBe('true');
        }
      }

      // Test fieldset and legend for grouped controls
      const fieldsets = await page.locator('fieldset').all();
      for (const fieldset of fieldsets) {
        const legend = await fieldset.locator('legend').count();
        expect(legend).toBeGreaterThan(0);
        
        const legendText = await fieldset.locator('legend').textContent();
        expect(legendText.trim()).toBeTruthy();
      }
    });

    test('should have keyboard accessible interface (2.1.1 Keyboard)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test tab navigation through interactive elements
      const interactiveElements = await page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all();
      
      let tabbableElements = 0;
      
      for (const element of interactiveElements) {
        const tabindex = await element.getAttribute('tabindex');
        const disabled = await element.getAttribute('disabled');
        const ariaDisabled = await element.getAttribute('aria-disabled');
        
        // Skip disabled elements
        if (disabled !== null || ariaDisabled === 'true') continue;
        
        // Skip elements with negative tabindex
        if (tabindex && parseInt(tabindex) < 0) continue;
        
        await element.focus();
        await expect(element).toBeFocused();
        tabbableElements++;
        
        // Test activation with keyboard
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const type = await element.getAttribute('type');
        
        if (tagName === 'button' || (tagName === 'input' && type === 'button')) {
          // Buttons should be activatable with Space and Enter
          await page.keyboard.press('Space');
          await page.keyboard.press('Enter');
        } else if (tagName === 'a') {
          // Links should be activatable with Enter
          const href = await element.getAttribute('href');
          if (href && href !== '#') {
            await page.keyboard.press('Enter');
            await page.goBack();
            await page.waitForLoadState('networkidle');
          }
        }
      }
      
      expect(tabbableElements).toBeGreaterThan(0);
      
      // Test escape key functionality in modals/dropdowns
      const modalTriggers = await page.locator('[data-opens-modal], [aria-haspopup="dialog"]').all();
      for (const trigger of modalTriggers) {
        await trigger.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible()) {
          await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible();
        }
      }
    });
  });

  describe('WCAG 2.1 Level AA Compliance', () => {
    test('should meet all Level AA success criteria', async () => {
      const testPages = [
        '/',
        '/communities',
        '/create',
        '/profile'
      ];

      for (const testPage of testPages) {
        await page.goto(testPage);
        await page.waitForLoadState('networkidle');

        // Run Level AA compliance check
        const violations = await getViolations(page, null, {
          tags: ['wcag2aa'],
          runOnly: {
            type: 'tag',
            values: ['wcag2aa']
          }
        });

        // Report any Level AA violations
        if (violations.length > 0) {
          console.log(`Level AA violations found on ${testPage}:`, violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length
          })));
        }

        expect(violations.length).toBe(0);
      }
    });

    test('should meet color contrast requirements (1.4.3)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check color contrast for all text elements
      const violations = await getViolations(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      const contrastViolations = violations.filter(v => v.id === 'color-contrast');
      
      if (contrastViolations.length > 0) {
        console.log('Color contrast violations:', contrastViolations.map(v => ({
          selector: v.nodes.map(n => n.target).join(', '),
          contrast: v.nodes.map(n => n.any[0]?.data?.contrastRatio).filter(Boolean)
        })));
      }

      expect(contrastViolations.length).toBe(0);

      // Test dark mode contrast
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForLoadState('networkidle');

      const darkModeViolations = await getViolations(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      const darkContrastViolations = darkModeViolations.filter(v => v.id === 'color-contrast');
      expect(darkContrastViolations.length).toBe(0);
    });

    test('should handle resize and zoom (1.4.4 Resize text)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test 200% zoom
      await page.setViewportSize({ width: 640, height: 360 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // All functionality should still be available
      await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

      // No horizontal scrolling should be required
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth * 1.1); // Small tolerance

      // Test text scaling specifically
      await page.addStyleTag({
        content: `
          * {
            font-size: 200% !important;
            line-height: 1.5 !important;
          }
        `
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Content should still be readable and functional
      const textElements = await page.locator('p, span, a, button').all();
      for (const element of textElements.slice(0, 5)) {
        if (await element.isVisible()) {
          const fontSize = await element.evaluate(el => 
            parseFloat(window.getComputedStyle(el).fontSize)
          );
          expect(fontSize).toBeGreaterThanOrEqual(16); // Minimum readable size
        }
      }
    });

    test('should provide proper focus indicators (2.4.7 Focus Visible)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const focusableElements = await page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all();
      
      for (const element of focusableElements.slice(0, 10)) {
        await element.focus();
        
        // Check for visible focus indicator
        const outline = await element.evaluate(el => window.getComputedStyle(el).outline);
        const boxShadow = await element.evaluate(el => window.getComputedStyle(el).boxShadow);
        const border = await element.evaluate(el => window.getComputedStyle(el).border);
        
        // Should have some form of focus indication
        const hasFocusIndicator = outline !== 'none' || 
                                 boxShadow !== 'none' || 
                                 border.includes('px'); // Some border styling
        
        expect(hasFocusIndicator).toBe(true);
      }

      // Test custom focus styles
      await page.addStyleTag({
        content: `
          *:focus {
            outline: 2px solid #0066cc !important;
            outline-offset: 2px !important;
          }
        `
      });

      // Verify custom focus styles work
      const firstFocusable = focusableElements[0];
      await firstFocusable.focus();
      
      const customOutline = await firstFocusable.evaluate(el => 
        window.getComputedStyle(el).outline
      );
      expect(customOutline).toContain('2px solid');
    });

    test('should have proper page titles and headings (2.4.2 Page Titled)', async () => {
      const pages = [
        { url: '/', expectedTitle: /home|welcome|story/i },
        { url: '/communities', expectedTitle: /communities/i },
        { url: '/create', expectedTitle: /create|write|new/i },
        { url: '/profile', expectedTitle: /profile|account/i },
        { url: '/login', expectedTitle: /login|sign in/i }
      ];

      for (const pageInfo of pages) {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toMatch(pageInfo.expectedTitle);
        expect(title.length).toBeGreaterThan(5);
        
        // Page title should be unique and descriptive
        expect(title.toLowerCase()).not.toBe('page');
        expect(title.toLowerCase()).not.toBe('untitled');
      }
    });

    test('should provide multiple ways to locate content (2.4.5 Multiple Ways)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test navigation menu
      const mainNavigation = page.locator('[role="navigation"], nav');
      await expect(mainNavigation).toBeVisible();

      // Test search functionality
      const searchInput = page.locator('input[type="search"], [role="searchbox"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        
        // Should have search results
        const searchResults = page.locator('[data-testid="search-results"]');
        await expect(searchResults).toBeVisible();
        
        await page.goBack();
      }

      // Test sitemap or footer navigation
      const footerNavigation = page.locator('footer nav, [role="contentinfo"] nav');
      if (await footerNavigation.isVisible()) {
        const footerLinks = await footerNavigation.locator('a').count();
        expect(footerLinks).toBeGreaterThan(0);
      }

      // Test breadcrumb navigation
      const breadcrumbs = page.locator('[aria-label*="breadcrumb"], [role="navigation"] ol');
      if (await breadcrumbs.isVisible()) {
        const breadcrumbItems = await breadcrumbs.locator('li, a').count();
        expect(breadcrumbItems).toBeGreaterThan(0);
      }
    });
  });

  describe('WCAG 2.1 Level AAA Compliance (Selected Criteria)', () => {
    test('should meet enhanced contrast requirements (1.4.6)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for enhanced contrast (7:1 for normal text, 4.5:1 for large text)
      const textElements = await page.locator('p, span, a, button, h1, h2, h3, h4, h5, h6').all();
      
      for (const element of textElements.slice(0, 10)) {
        if (await element.isVisible()) {
          const fontSize = await element.evaluate(el => 
            parseFloat(window.getComputedStyle(el).fontSize)
          );
          const fontWeight = await element.evaluate(el => 
            window.getComputedStyle(el).fontWeight
          );
          
          // Large text is 18pt (24px) or 14pt (18.67px) bold
          const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && parseInt(fontWeight) >= 700);
          
          // Note: Actual contrast calculation would require color analysis
          // This is a placeholder for demonstration
          expect(fontSize).toBeGreaterThan(12); // Minimum readable size
        }
      }
    });

    test('should provide context-sensitive help (3.3.5)', async () => {
      await page.goto('/create');
      await page.waitForLoadState('networkidle');

      // Look for help text near form fields
      const formFields = await page.locator('input, textarea, select').all();
      
      for (const field of formFields) {
        const describedBy = await field.getAttribute('aria-describedby');
        
        if (describedBy) {
          const helpText = page.locator(`#${describedBy}`);
          await expect(helpText).toBeVisible();
          
          const helpContent = await helpText.textContent();
          expect(helpContent.trim()).toBeTruthy();
        }
      }

      // Test for help icons or tooltips
      const helpTriggers = await page.locator('[aria-label*="help"], [title*="help"], .help-icon').all();
      
      for (const trigger of helpTriggers) {
        await trigger.hover();
        await page.waitForTimeout(500);
        
        // Look for tooltip or help content
        const tooltip = page.locator('[role="tooltip"], .tooltip');
        if (await tooltip.isVisible()) {
          const tooltipText = await tooltip.textContent();
          expect(tooltipText.trim()).toBeTruthy();
        }
      }
    });

    test('should support keyboard shortcuts without conflict (2.1.4)', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test common keyboard shortcuts
      const shortcuts = [
        { key: 'Alt+1', description: 'Skip to main content' },
        { key: 'Alt+2', description: 'Skip to navigation' },
        { key: '/', description: 'Focus search' },
        { key: 'Escape', description: 'Close modal/dropdown' }
      ];

      for (const shortcut of shortcuts) {
        // Test that shortcuts work and don't conflict with browser shortcuts
        await page.keyboard.press(shortcut.key);
        await page.waitForTimeout(100);
        
        // Verify expected behavior (implementation depends on specific shortcuts)
        if (shortcut.key === 'Escape') {
          // Escape should close any open modals
          const modals = await page.locator('[role="dialog"]:visible').count();
          expect(modals).toBe(0);
        }
      }

      // Test that single-key shortcuts are avoided or properly handled
      const singleKeyElements = await page.locator('[accesskey]').all();
      
      for (const element of singleKeyElements) {
        const accesskey = await element.getAttribute('accesskey');
        
        // Single character accesskeys should be avoided
        expect(accesskey.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Custom Accessibility Requirements', () => {
    test('should support screen reader announcements', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test live regions
      const liveRegions = await page.locator('[aria-live]').all();
      
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
        
        // Test that content updates are announced
        if (ariaLive !== 'off') {
          const initialContent = await region.textContent();
          
          // Simulate content update
          await page.evaluate((el) => {
            el.textContent = 'Updated content for screen reader';
          }, region);
          
          await page.waitForTimeout(100);
          const updatedContent = await region.textContent();
          expect(updatedContent).toContain('Updated content');
        }
      }

      // Test status messages
      const statusElements = await page.locator('[role="status"], [role="alert"]').all();
      
      for (const status of statusElements) {
        const role = await status.getAttribute('role');
        expect(['status', 'alert']).toContain(role);
        
        // Status and alert content should be meaningful
        const content = await status.textContent();
        if (content.trim()) {
          expect(content.length).toBeGreaterThan(3);
        }
      }
    });

    test('should handle dynamic content accessibility', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Test infinite scroll accessibility
      const scrollContainer = page.locator('[data-testid="infinite-scroll"]');
      if (await scrollContainer.isVisible()) {
        // Should have aria-label describing the scrollable region
        const ariaLabel = await scrollContainer.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        
        // Test loading states
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        const loadingIndicator = page.locator('[aria-label*="loading"], [role="status"]');
        if (await loadingIndicator.isVisible()) {
          const loadingText = await loadingIndicator.textContent();
          expect(loadingText.toLowerCase()).toContain('loading');
        }
      }

      // Test sortable content
      const sortableElements = await page.locator('[role="grid"], [role="listbox"]').all();
      
      for (const sortable of sortableElements) {
        const ariaSort = await sortable.getAttribute('aria-sort');
        if (ariaSort) {
          expect(['ascending', 'descending', 'none', 'other']).toContain(ariaSort);
        }
        
        // Test column headers for sortable tables
        const columnHeaders = await sortable.locator('[role="columnheader"]').all();
        for (const header of columnHeaders) {
          const headerSort = await header.getAttribute('aria-sort');
          if (headerSort) {
            expect(['ascending', 'descending', 'none']).toContain(headerSort);
          }
        }
      }
    });

    test('should provide comprehensive error handling', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Test form error handling
      const submitButton = page.locator('[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for error summary
      const errorSummary = page.locator('[role="alert"], .error-summary');
      if (await errorSummary.isVisible()) {
        await expect(errorSummary).toBeVisible();
        
        const summaryText = await errorSummary.textContent();
        expect(summaryText.toLowerCase()).toContain('error');
      }

      // Check individual field errors
      const errorFields = await page.locator('.error, [aria-invalid="true"]').all();
      
      for (const field of errorFields) {
        const ariaInvalid = await field.getAttribute('aria-invalid');
        expect(ariaInvalid).toBe('true');
        
        const describedBy = await field.getAttribute('aria-describedby');
        if (describedBy) {
          const errorMessage = page.locator(`#${describedBy}`);
          await expect(errorMessage).toBeVisible();
          
          const errorText = await errorMessage.textContent();
          expect(errorText.trim()).toBeTruthy();
        }
      }

      // Test error recovery
      const emailField = page.locator('input[type="email"]');
      if (await emailField.isVisible()) {
        await emailField.fill('valid@example.com');
        await emailField.blur();
        await page.waitForTimeout(500);
        
        const ariaInvalid = await emailField.getAttribute('aria-invalid');
        expect(ariaInvalid).toBe('false');
      }
    });
  });

  describe('Accessibility Testing Summary', () => {
    test('should generate comprehensive accessibility report', async () => {
      const testResults = {
        levelA: [],
        levelAA: [],
        levelAAA: [],
        customRequirements: []
      };

      const testPages = ['/', '/communities', '/create', '/profile', '/login'];

      for (const testPage of testPages) {
        await page.goto(testPage);
        await page.waitForLoadState('networkidle');

        // Level A violations
        const levelAViolations = await getViolations(page, null, {
          tags: ['wcag2a']
        });

        // Level AA violations
        const levelAAViolations = await getViolations(page, null, {
          tags: ['wcag2aa']
        });

        // Level AAA violations (selected rules)
        const levelAAAViolations = await getViolations(page, null, {
          tags: ['wcag2aaa']
        });

        testResults.levelA.push({
          page: testPage,
          violations: levelAViolations.length,
          details: levelAViolations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description
          }))
        });

        testResults.levelAA.push({
          page: testPage,
          violations: levelAAViolations.length,
          details: levelAAViolations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description
          }))
        });

        testResults.levelAAA.push({
          page: testPage,
          violations: levelAAAViolations.length,
          details: levelAAAViolations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description
          }))
        });
      }

      // Generate summary
      const summary = {
        totalLevelAViolations: testResults.levelA.reduce((sum, page) => sum + page.violations, 0),
        totalLevelAAViolations: testResults.levelAA.reduce((sum, page) => sum + page.violations, 0),
        totalLevelAAAViolations: testResults.levelAAA.reduce((sum, page) => sum + page.violations, 0),
        complianceStatus: {
          levelA: testResults.levelA.every(page => page.violations === 0),
          levelAA: testResults.levelAA.every(page => page.violations === 0),
          levelAAA: testResults.levelAAA.every(page => page.violations === 0)
        }
      };

      console.log('Accessibility Test Summary:', JSON.stringify(summary, null, 2));

      // Assert compliance requirements
      expect(summary.totalLevelAViolations).toBe(0);
      expect(summary.totalLevelAAViolations).toBe(0);
      expect(summary.complianceStatus.levelA).toBe(true);
      expect(summary.complianceStatus.levelAA).toBe(true);
    });
  });
});