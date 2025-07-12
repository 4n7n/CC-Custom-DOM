const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const { injectAxe, checkA11y, getViolations } = require('axe-playwright');

describe('Community Accessibility Tests', () => {
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
    
    // Inject axe-core for accessibility testing
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
    await injectAxe(page);
  });

  afterEach(async () => {
    await context.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Community Navigation Accessibility', () => {
    test('should have accessible navigation structure', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Check for basic accessibility violations
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });

      // Test keyboard navigation through main menu
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();

      // Navigate through all main navigation items
      const navItems = ['communities', 'discover', 'create', 'profile'];
      for (const item of navItems) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        const text = await focusedElement.textContent();
        
        expect(ariaLabel || text).toBeTruthy();
      }

      // Test navigation landmarks
      await expect(page.locator('nav[role="navigation"]')).toBeVisible();
      await expect(page.locator('main[role="main"]')).toBeVisible();
      
      // Check for skip links
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-main"]');
      if (await skipLink.isVisible()) {
        await expect(skipLink).toBeVisible();
        await skipLink.click();
        
        // Verify focus moves to main content
        const mainContent = await page.locator(':focus').first();
        const mainId = await mainContent.getAttribute('id');
        expect(mainId).toBe('main-content');
      }

      // Test breadcrumb navigation accessibility
      const breadcrumbs = page.locator('[aria-label="Breadcrumb"]');
      if (await breadcrumbs.isVisible()) {
        await expect(breadcrumbs).toHaveAttribute('role', 'navigation');
        
        const breadcrumbLinks = await breadcrumbs.locator('a').all();
        for (const link of breadcrumbLinks) {
          const ariaCurrent = await link.getAttribute('aria-current');
          const href = await link.getAttribute('href');
          expect(href || ariaCurrent).toBeTruthy();
        }
      }
    });

    test('should support screen reader navigation', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);

      // Verify proper heading order
      let previousLevel = 0;
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const currentLevel = parseInt(tagName.charAt(1));
        
        if (previousLevel > 0) {
          // Heading levels should not skip (e.g., h2 should not jump to h4)
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        }
        previousLevel = currentLevel;
      }

      // Test ARIA landmarks
      const landmarks = [
        { selector: '[role="banner"]', name: 'banner' },
        { selector: '[role="main"]', name: 'main content' },
        { selector: '[role="navigation"]', name: 'navigation' },
        { selector: '[role="complementary"]', name: 'complementary' },
        { selector: '[role="contentinfo"]', name: 'footer' }
      ];

      for (const landmark of landmarks) {
        const element = page.locator(landmark.selector).first();
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          
          // Check for accessible names
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledBy = await element.getAttribute('aria-labelledby');
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }

      // Test list structures
      const lists = await page.locator('ul, ol').all();
      for (const list of lists) {
        const listItems = await list.locator('li').count();
        expect(listItems).toBeGreaterThan(0);
        
        // Verify lists have proper roles if needed
        const role = await list.getAttribute('role');
        if (role) {
          expect(['list', 'menu', 'menubar', 'tablist']).toContain(role);
        }
      }
    });

    test('should handle focus management correctly', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Test modal focus management
      const createCommunityButton = page.locator('[data-testid="create-community"]');
      if (await createCommunityButton.isVisible()) {
        await createCommunityButton.click();
        
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        
        // Focus should be trapped within modal
        const modalFocusableElements = await modal.locator('button, input, select, textarea, a[href]').all();
        expect(modalFocusableElements.length).toBeGreaterThan(0);
        
        // First focusable element should receive focus
        const firstFocusable = modalFocusableElements[0];
        await expect(firstFocusable).toBeFocused();
        
        // Test tab trapping
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').first();
        const isInModal = await modal.locator(':focus').count() > 0;
        expect(isInModal).toBe(true);
        
        // Test escape key
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
        
        // Focus should return to trigger element
        await expect(createCommunityButton).toBeFocused();
      }

      // Test dropdown focus management
      const dropdownTrigger = page.locator('[data-testid="community-filter-dropdown"]');
      if (await dropdownTrigger.isVisible()) {
        await dropdownTrigger.click();
        
        const dropdown = page.locator('[role="listbox"], [role="menu"]');
        await expect(dropdown).toBeVisible();
        
        // Arrow keys should navigate dropdown options
        await page.keyboard.press('ArrowDown');
        const selectedOption = await page.locator('[role="option"]:focus, [role="menuitem"]:focus').first();
        await expect(selectedOption).toBeVisible();
        
        // Enter should select option
        await page.keyboard.press('Enter');
        await expect(dropdown).not.toBeVisible();
      }
    });
  });

  describe('Community Content Accessibility', () => {
    test('should have accessible community cards and listings', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Check community cards accessibility
      const communityCards = await page.locator('[data-testid="community-card"]').all();
      expect(communityCards.length).toBeGreaterThan(0);

      for (const card of communityCards.slice(0, 3)) {
        // Cards should be focusable and have accessible names
        const tabIndex = await card.getAttribute('tabindex');
        const role = await card.getAttribute('role');
        expect(tabIndex || role).toBeTruthy();

        // Check for accessible name
        const ariaLabel = await card.getAttribute('aria-label');
        const ariaLabelledBy = await card.getAttribute('aria-labelledby');
        const cardText = await card.textContent();
        expect(ariaLabel || ariaLabelledBy || cardText).toBeTruthy();

        // Test card interactions
        await card.focus();
        await expect(card).toBeFocused();
        
        // Enter key should activate card
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        
        // Verify navigation occurred
        const url = page.url();
        expect(url).toContain('/communities/');
        
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }

      // Check for proper image alt text
      const images = await page.locator('img').all();
      for (const image of images) {
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');
        
        // Images should have alt text or be marked as decorative
        expect(alt !== null || role === 'presentation').toBe(true);
      }

      // Test search functionality accessibility
      const searchInput = page.locator('[data-testid="community-search"]');
      if (await searchInput.isVisible()) {
        const ariaLabel = await searchInput.getAttribute('aria-label');
        const placeholder = await searchInput.getAttribute('placeholder');
        const labelId = await searchInput.getAttribute('aria-labelledby');
        
        expect(ariaLabel || placeholder || labelId).toBeTruthy();

        // Test search results announcement
        await searchInput.fill('technology');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const resultsRegion = page.locator('[aria-live="polite"], [role="status"]');
        if (await resultsRegion.isVisible()) {
          const announcement = await resultsRegion.textContent();
          expect(announcement).toContain('result');
        }
      }
    });

    test('should provide accessible community content and discussions', async () => {
      // Navigate to a specific community
      await page.goto('/communities/test-community');
      await page.waitForLoadState('networkidle');

      // Run accessibility scan on community page
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true }
        }
      });

      // Test discussion thread accessibility
      const discussions = await page.locator('[data-testid="discussion-item"]').all();
      
      for (const discussion of discussions.slice(0, 2)) {
        // Each discussion should have proper heading structure
        const heading = discussion.locator('h2, h3, h4, h5, h6').first();
        await expect(heading).toBeVisible();

        // Check for accessible metadata
        const metadata = discussion.locator('[data-testid="discussion-metadata"]');
        if (await metadata.isVisible()) {
          const ariaLabel = await metadata.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
        }

        // Test vote buttons accessibility
        const upvoteButton = discussion.locator('[data-testid="upvote-button"]');
        if (await upvoteButton.isVisible()) {
          const ariaLabel = await upvoteButton.getAttribute('aria-label');
          const ariaPressed = await upvoteButton.getAttribute('aria-pressed');
          expect(ariaLabel).toBeTruthy();
          expect(['true', 'false', null]).toContain(ariaPressed);
        }
      }

      // Test comment form accessibility
      const commentForm = page.locator('[data-testid="comment-form"]');
      if (await commentForm.isVisible()) {
        const commentInput = commentForm.locator('textarea, input');
        
        const label = await commentInput.getAttribute('aria-label');
        const labelledBy = await commentInput.getAttribute('aria-labelledby');
        const placeholder = await commentInput.getAttribute('placeholder');
        
        expect(label || labelledBy || placeholder).toBeTruthy();

        // Test required field indicators
        const required = await commentInput.getAttribute('required');
        const ariaRequired = await commentInput.getAttribute('aria-required');
        
        if (required !== null) {
          expect(ariaRequired).toBe('true');
        }
      }

      // Test community rules accessibility
      const rulesSection = page.locator('[data-testid="community-rules"]');
      if (await rulesSection.isVisible()) {
        const rulesHeading = rulesSection.locator('h2, h3, h4').first();
        await expect(rulesHeading).toBeVisible();

        const rulesList = rulesSection.locator('ul, ol');
        if (await rulesList.isVisible()) {
          const listItems = await rulesList.locator('li').count();
          expect(listItems).toBeGreaterThan(0);
        }
      }
    });

    test('should support assistive technology interactions', async () => {
      await page.goto('/communities/test-community');
      await page.waitForLoadState('networkidle');

      // Test ARIA live regions for dynamic content
      const liveRegions = await page.locator('[aria-live]').all();
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }

      // Test expandable content
      const expandableElements = await page.locator('[aria-expanded]').all();
      for (const element of expandableElements) {
        const expanded = await element.getAttribute('aria-expanded');
        expect(['true', 'false']).toContain(expanded);

        // Test expansion functionality
        if (expanded === 'false') {
          await element.click();
          const newExpanded = await element.getAttribute('aria-expanded');
          expect(newExpanded).toBe('true');

          // Verify controlled content is visible
          const controls = await element.getAttribute('aria-controls');
          if (controls) {
            const controlledElement = page.locator(`#${controls}`);
            await expect(controlledElement).toBeVisible();
          }
        }
      }

      // Test tabpanel accessibility
      const tabpanels = await page.locator('[role="tabpanel"]').all();
      for (const panel of tabpanels) {
        const ariaLabelledBy = await panel.getAttribute('aria-labelledby');
        expect(ariaLabelledBy).toBeTruthy();

        // Verify corresponding tab exists
        const correspondingTab = page.locator(`#${ariaLabelledBy}`);
        await expect(correspondingTab).toBeVisible();
      }

      // Test form field groups
      const fieldsets = await page.locator('fieldset').all();
      for (const fieldset of fieldsets) {
        const legend = fieldset.locator('legend');
        await expect(legend).toBeVisible();

        const legendText = await legend.textContent();
        expect(legendText.trim()).toBeTruthy();
      }
    });
  });

  describe('Community Forms and Interactions Accessibility', () => {
    test('should have accessible community creation form', async () => {
      await page.goto('/communities/create');
      await page.waitForLoadState('networkidle');

      // Run comprehensive accessibility check
      await checkA11y(page, null, {
        tags: ['wcag2a', 'wcag2aa'],
        rules: {
          'form-field-multiple-labels': { enabled: true },
          'label': { enabled: true },
          'required-attr': { enabled: true }
        }
      });

      // Test form structure
      const form = page.locator('form');
      await expect(form).toBeVisible();

      // Check all form fields have proper labels
      const inputs = await form.locator('input, textarea, select').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Each input should have an associated label
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        } else {
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }

        // Test required field indication
        const required = await input.getAttribute('required');
        const ariaRequired = await input.getAttribute('aria-required');
        
        if (required !== null) {
          expect(ariaRequired).toBe('true');
          
          // Required fields should have visual indication
          const parentLabel = page.locator(`label[for="${id}"]`);
          if (await parentLabel.count() > 0) {
            const labelText = await parentLabel.textContent();
            expect(labelText).toMatch(/\*|required/i);
          }
        }
      }

      // Test error handling accessibility
      const submitButton = form.locator('[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for error messages
      const errorMessages = await page.locator('[role="alert"], .error-message').all();
      for (const error of errorMessages) {
        await expect(error).toBeVisible();
        
        // Error should be associated with the field
        const ariaDescribedBy = await error.getAttribute('aria-describedby');
        const fieldId = await error.getAttribute('data-field');
        
        if (fieldId) {
          const field = page.locator(`#${fieldId}`);
          const fieldDescribedBy = await field.getAttribute('aria-describedby');
          expect(fieldDescribedBy).toContain(error.locator('id'));
        }
      }

      // Test error announcement
      const errorSummary = page.locator('[role="alert"][aria-live="assertive"]');
      if (await errorSummary.isVisible()) {
        const summaryText = await errorSummary.textContent();
        expect(summaryText).toContain('error');
      }
    });

    test('should provide accessible file upload functionality', async () => {
      await page.goto('/communities/create');
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // File input should have accessible name
        const ariaLabel = await fileInput.getAttribute('aria-label');
        const labelledBy = await fileInput.getAttribute('aria-labelledby');
        const id = await fileInput.getAttribute('id');
        
        let hasLabel = false;
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabel = await label.count() > 0;
        }
        
        expect(ariaLabel || labelledBy || hasLabel).toBeTruthy();

        // Test file upload with keyboard
        await fileInput.focus();
        await expect(fileInput).toBeFocused();
        
        // Space or Enter should activate file picker
        await page.keyboard.press('Space');
        // Note: File picker interaction would need to be mocked in real test
        
        // Test drag and drop accessibility
        const dropZone = page.locator('[data-testid="file-drop-zone"]');
        if (await dropZone.isVisible()) {
          const ariaLabel = await dropZone.getAttribute('aria-label');
          const role = await dropZone.getAttribute('role');
          
          expect(ariaLabel || role).toBeTruthy();
          
          // Drop zone should be keyboard accessible
          await dropZone.focus();
          await expect(dropZone).toBeFocused();
        }
      }
    });

    test('should handle rich text editor accessibility', async () => {
      await page.goto('/communities/test-community/discussions/create');
      await page.waitForLoadState('networkidle');

      const editor = page.locator('[data-testid="rich-text-editor"]');
      if (await editor.isVisible()) {
        // Editor should have accessible name
        const ariaLabel = await editor.getAttribute('aria-label');
        const ariaLabelledBy = await editor.getAttribute('aria-labelledby');
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();

        // Editor should be focusable
        await editor.focus();
        await expect(editor).toBeFocused();

        // Test toolbar accessibility
        const toolbar = page.locator('[role="toolbar"]');
        if (await toolbar.isVisible()) {
          const toolbarLabel = await toolbar.getAttribute('aria-label');
          expect(toolbarLabel).toBeTruthy();

          // Toolbar buttons should have accessible names
          const toolbarButtons = await toolbar.locator('button').all();
          for (const button of toolbarButtons) {
            const buttonLabel = await button.getAttribute('aria-label');
            const buttonText = await button.textContent();
            expect(buttonLabel || buttonText.trim()).toBeTruthy();

            // Test button states
            const ariaPressed = await button.getAttribute('aria-pressed');
            if (ariaPressed !== null) {
              expect(['true', 'false']).toContain(ariaPressed);
            }
          }

          // Test keyboard navigation in toolbar
          await toolbar.locator('button').first().focus();
          await page.keyboard.press('ArrowRight');
          
          const focusedButton = await page.locator(':focus').first();
          const isInToolbar = await toolbar.locator(':focus').count() > 0;
          expect(isInToolbar).toBe(true);
        }

        // Test content editing accessibility
        await editor.type('Test content for accessibility');
        const content = await editor.textContent();
        expect(content).toContain('Test content');

        // Test formatting accessibility
        await page.keyboard.down('Control');
        await page.keyboard.press('b');
        await page.keyboard.up('Control');
        
        // Bold text should be properly marked up
        const boldText = editor.locator('strong, b');
        if (await boldText.count() > 0) {
          await expect(boldText).toBeVisible();
        }
      }
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should meet WCAG color contrast requirements', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Check color contrast violations
      const violations = await getViolations(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      const contrastViolations = violations.filter(v => v.id === 'color-contrast');
      expect(contrastViolations.length).toBe(0);

      // Test high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify dark mode accessibility
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      // Test custom high contrast theme
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              border: 1px solid !important;
              background: white !important;
              color: black !important;
            }
          }
        `
      });

      await page.emulateMedia({ prefersColorScheme: 'light', prefersContrast: 'high' });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify high contrast mode works
      const textElements = await page.locator('p, span, a, button').all();
      for (const element of textElements.slice(0, 5)) {
        if (await element.isVisible()) {
          const color = await element.evaluate(el => window.getComputedStyle(el).color);
          const backgroundColor = await element.evaluate(el => window.getComputedStyle(el).backgroundColor);
          
          // In high contrast mode, should have defined colors
          expect(color).toBeTruthy();
        }
      }
    });

    test('should support reduced motion preferences', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Test reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that animations are reduced or removed
      const animatedElements = await page.locator('.animated, [data-animate]').all();
      for (const element of animatedElements) {
        const animationDuration = await element.evaluate(el => 
          window.getComputedStyle(el).animationDuration
        );
        const transitionDuration = await element.evaluate(el => 
          window.getComputedStyle(el).transitionDuration
        );

        // In reduced motion mode, animations should be minimal
        if (animationDuration !== '0s') {
          expect(parseFloat(animationDuration)).toBeLessThanOrEqual(0.2);
        }
        if (transitionDuration !== '0s') {
          expect(parseFloat(transitionDuration)).toBeLessThanOrEqual(0.2);
        }
      }

      // Test that essential animations still work
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      if (await loadingSpinner.isVisible()) {
        // Loading indicators should still animate even in reduced motion
        const spinnerAnimation = await loadingSpinner.evaluate(el => 
          window.getComputedStyle(el).animationPlayState
        );
        expect(spinnerAnimation).toBe('running');
      }
    });

    test('should handle zoom and magnification', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Test 200% zoom
      await page.setViewportSize({ width: 640, height: 360 }); // Simulate 200% zoom
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that content is still accessible at high zoom
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation"]')).toBeVisible();

      // Verify horizontal scrolling isn't required
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth * 1.1); // Allow small tolerance

      // Test 400% zoom equivalent
      await page.setViewportSize({ width: 320, height: 180 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Essential functionality should still be available
      await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
      
      // Test text scaling
      const textElement = page.locator('p, span').first();
      if (await textElement.isVisible()) {
        const fontSize = await textElement.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        expect(parseInt(fontSize)).toBeGreaterThanOrEqual(12); // Minimum readable size
      }
    });
  });
});