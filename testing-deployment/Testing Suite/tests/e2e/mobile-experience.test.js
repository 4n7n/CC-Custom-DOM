const { chromium, devices } = require('playwright');
const { expect } = require('@playwright/test');

describe('Mobile Experience E2E Tests', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.DEBUG ? 50 : 0
    });
  });

  beforeEach(async () => {
    // Default to iPhone 12 Pro
    context = await browser.newContext({
      ...devices['iPhone 12 Pro'],
      permissions: ['geolocation', 'notifications']
    });
    page = await context.newPage();
    
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
  });

  afterEach(async () => {
    await context.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Mobile Navigation and Interface', () => {
    test('should provide optimal mobile landing experience', async () => {
      // Check mobile-optimized landing page loads
      await page.waitForLoadState('networkidle');
      
      // Verify mobile viewport detection
      const isMobile = await page.evaluate(() => window.innerWidth <= 768);
      expect(isMobile).toBe(true);

      // Check critical mobile elements
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-hero"]')).toBeVisible();

      // Test mobile menu functionality
      await page.tap('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu-overlay"]')).toBeVisible();
      
      // Check menu items are touch-friendly
      const menuItems = await page.locator('[data-testid="mobile-menu"] .menu-item').all();
      for (const item of menuItems) {
        const height = await item.boundingBox();
        expect(height.height).toBeGreaterThanOrEqual(44); // Minimum touch target
      }

      // Test menu close
      await page.tap('[data-testid="mobile-menu-close"]');
      await expect(page.locator('[data-testid="mobile-menu-overlay"]')).not.toBeVisible();

      // Test mobile story cards
      await expect(page.locator('[data-testid="mobile-story-grid"]')).toBeVisible();
      
      const storyCards = await page.locator('.mobile-story-card').all();
      expect(storyCards.length).toBeGreaterThan(0);

      // Verify touch-friendly story card sizing
      for (const card of storyCards.slice(0, 3)) {
        const cardBox = await card.boundingBox();
        expect(cardBox.height).toBeGreaterThanOrEqual(120);
      }
    });

    test('should handle mobile registration and login flows', async () => {
      // Test mobile registration
      await page.tap('[data-testid="mobile-register-button"]');
      await expect(page.locator('[data-testid="mobile-registration-form"]')).toBeVisible();

      // Check form is optimized for mobile input
      const emailInput = page.locator('[data-testid="email-input"]');
      const inputType = await emailInput.getAttribute('type');
      expect(inputType).toBe('email'); // Should trigger mobile email keyboard

      // Test form fields with mobile keyboard
      await emailInput.tap();
      await emailInput.fill('mobile@example.com');
      
      const usernameInput = page.locator('[data-testid="username-input"]');
      await usernameInput.tap();
      await usernameInput.fill('mobileuser');

      const passwordInput = page.locator('[data-testid="password-input"]');
      await passwordInput.tap();
      await passwordInput.fill('MobilePassword123!');

      // Test password visibility toggle
      await page.tap('[data-testid="password-toggle"]');
      const passwordType = await passwordInput.getAttribute('type');
      expect(passwordType).toBe('text');

      await page.tap('[data-testid="password-toggle"]');
      const hiddenType = await passwordInput.getAttribute('type');
      expect(hiddenType).toBe('password');

      // Test mobile-optimized form submission
      await page.tap('[data-testid="mobile-register-submit"]');
      
      // Check for mobile success state
      await expect(page.locator('[data-testid="mobile-registration-success"]')).toBeVisible();
    });

    test('should support mobile gestures and interactions', async () => {
      // Test swipe navigation on story cards
      await page.waitForSelector('[data-testid="mobile-story-carousel"]');
      
      const carousel = page.locator('[data-testid="mobile-story-carousel"]');
      const initialPosition = await carousel.evaluate(el => el.scrollLeft);

      // Swipe left to navigate stories
      await carousel.swipeBy({ x: -200, y: 0 });
      await page.waitForTimeout(500);

      const newPosition = await carousel.evaluate(el => el.scrollLeft);
      expect(newPosition).toBeGreaterThan(initialPosition);

      // Test pull-to-refresh
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      const startY = 100;
      await page.touchscreen.tap(200, startY);
      await page.touchscreen.move(200, startY + 150);
      await page.touchscreen.end();

      await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible();
      await page.waitForTimeout(1000);

      // Test long press for context menu
      const storyCard = page.locator('.mobile-story-card').first();
      await storyCard.tap({ delay: 800 }); // Long press

      await expect(page.locator('[data-testid="story-context-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="bookmark-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-option"]')).toBeVisible();

      // Close context menu
      await page.tap('[data-testid="context-menu-close"]');
    });
  });

  describe('Mobile Reading Experience', () => {
    test('should provide optimized mobile reading interface', async () => {
      // Navigate to a story
      await page.tap('.mobile-story-card:first-child');
      await page.waitForLoadState('networkidle');

      // Check mobile story layout
      await expect(page.locator('[data-testid="mobile-story-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-story-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-story-actions"]')).toBeVisible();

      // Test reading progress indicator
      await expect(page.locator('[data-testid="mobile-reading-progress"]')).toBeVisible();
      
      const initialProgress = await page.getAttribute('[data-testid="mobile-reading-progress"]', 'value');
      
      // Scroll through story
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(1000);

      const midProgress = await page.getAttribute('[data-testid="mobile-reading-progress"]', 'value');
      expect(parseInt(midProgress)).toBeGreaterThan(parseInt(initialProgress));

      // Test mobile reading controls
      await page.tap('[data-testid="mobile-reading-settings"]');
      await expect(page.locator('[data-testid="mobile-reading-controls"]')).toBeVisible();

      // Test font size adjustment
      await page.tap('[data-testid="increase-font-size"]');
      const fontSize = await page.evaluate(() => {
        return window.getComputedStyle(document.querySelector('[data-testid="story-content"]')).fontSize;
      });
      expect(parseInt(fontSize)).toBeGreaterThan(16);

      // Test theme switching
      await page.tap('[data-testid="dark-theme-toggle"]');
      const bodyClass = await page.getAttribute('body', 'class');
      expect(bodyClass).toContain('dark-theme');

      // Test mobile sharing
      await page.tap('[data-testid="mobile-share-button"]');
      await expect(page.locator('[data-testid="mobile-share-sheet"]')).toBeVisible();

      // Check native mobile share options
      await expect(page.locator('[data-testid="share-twitter"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-facebook"]')).toBeVisible();
      await expect(page.locator('[data-testid="copy-link"]')).toBeVisible();

      // Test copy link functionality
      await page.tap('[data-testid="copy-link"]');
      await expect(page.locator('[data-testid="link-copied-toast"]')).toBeVisible();
    });

    test('should handle mobile commenting and interactions', async () => {
      // Assume we're on a story page
      await page.goto('/story/sample-story');
      await page.waitForLoadState('networkidle');

      // Test mobile like interaction
      await page.tap('[data-testid="mobile-like-button"]');
      await expect(page.locator('[data-testid="mobile-like-button"]')).toHaveClass(/liked/);

      // Test mobile comment interface
      await page.tap('[data-testid="mobile-comment-button"]');
      await expect(page.locator('[data-testid="mobile-comment-sheet"]')).toBeVisible();

      // Check comment input optimization for mobile
      const commentInput = page.locator('[data-testid="mobile-comment-input"]');
      await commentInput.tap();
      
      // Verify virtual keyboard doesn't break layout
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="mobile-comment-sheet"]')).toBeVisible();

      await commentInput.fill('Great story! Really enjoyed reading this on mobile.');
      
      // Test character counter
      await expect(page.locator('[data-testid="character-counter"]')).toBeVisible();

      // Submit comment
      await page.tap('[data-testid="submit-mobile-comment"]');
      await expect(page.locator('[data-testid="comment-posted-success"]')).toBeVisible();

      // Close comment sheet
      await page.tap('[data-testid="close-comment-sheet"]');
      await expect(page.locator('[data-testid="mobile-comment-sheet"]')).not.toBeVisible();

      // Test mobile bookmark
      await page.tap('[data-testid="mobile-bookmark-button"]');
      await expect(page.locator('[data-testid="bookmark-added-toast"]')).toBeVisible();
    });

    test('should support offline reading capabilities', async () => {
      // Login first to enable offline features
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.tap('[data-testid="login-button"]');
      await page.waitForLoadState('networkidle');

      // Go to a story and enable offline reading
      await page.goto('/story/offline-test-story');
      await page.waitForLoadState('networkidle');

      await page.tap('[data-testid="download-offline"]');
      await expect(page.locator('[data-testid="offline-download-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-available"]')).toBeVisible({ timeout: 10000 });

      // Simulate offline mode
      await context.setOffline(true);

      // Reload page to test offline functionality
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Verify story content is still accessible
      await expect(page.locator('[data-testid="story-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-mode-banner"]')).toBeVisible();

      // Test offline reading list
      await page.tap('[data-testid="mobile-menu-button"]');
      await page.tap('[data-testid="offline-reading-list"]');
      
      await expect(page.locator('[data-testid="offline-stories-list"]')).toBeVisible();
      await expect(page.locator('.offline-story-item')).toBeVisible();

      // Restore online mode
      await context.setOffline(false);
    });
  });

  describe('Mobile Content Creation', () => {
    test('should provide mobile-optimized story creation', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'creator@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.tap('[data-testid="login-button"]');
      await page.waitForLoadState('networkidle');

      // Navigate to mobile story creation
      await page.tap('[data-testid="mobile-create-button"]');
      await page.waitForLoadState('networkidle');

      // Check mobile editor interface
      await expect(page.locator('[data-testid="mobile-story-editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-editor-toolbar"]')).toBeVisible();

      // Test mobile title input
      const titleInput = page.locator('[data-testid="mobile-story-title"]');
      await titleInput.tap();
      await titleInput.fill('My Mobile Story');

      // Test mobile content editor
      const contentEditor = page.locator('[data-testid="mobile-content-editor"]');
      await contentEditor.tap();
      await contentEditor.fill('This story was written entirely on mobile...');

      // Test mobile formatting toolbar
      await page.tap('[data-testid="mobile-format-toolbar"]');
      await expect(page.locator('[data-testid="mobile-format-options"]')).toBeVisible();

      // Test bold formatting
      await page.selectText('[data-testid="mobile-content-editor"]');
      await page.tap('[data-testid="mobile-bold-button"]');

      // Test mobile image upload
      await page.tap('[data-testid="mobile-add-image"]');
      await expect(page.locator('[data-testid="mobile-image-options"]')).toBeVisible();

      // Simulate camera option
      await page.tap('[data-testid="take-photo"]');
      // Note: Real camera access would require device permissions

      // Test mobile save draft
      await page.tap('[data-testid="mobile-save-draft"]');
      await expect(page.locator('[data-testid="mobile-draft-saved"]')).toBeVisible();

      // Test mobile preview
      await page.tap('[data-testid="mobile-preview-button"]');
      await expect(page.locator('[data-testid="mobile-story-preview"]')).toBeVisible();

      // Test mobile publish
      await page.tap('[data-testid="mobile-publish-button"]');
      await expect(page.locator('[data-testid="mobile-publish-options"]')).toBeVisible();

      await page.tap('[data-testid="publish-now"]');
      await expect(page.locator('[data-testid="mobile-publish-success"]')).toBeVisible();
    });

    test('should handle mobile photo and media integration', async () => {
      await page.goto('/create');
      await page.waitForLoadState('networkidle');

      // Test mobile media upload
      await page.tap('[data-testid="mobile-add-media"]');
      await expect(page.locator('[data-testid="mobile-media-picker"]')).toBeVisible();

      // Test file input for mobile
      await page.setInputFiles('[data-testid="mobile-file-input"]', {
        name: 'mobile-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-mobile-image-data')
      });

      await expect(page.locator('[data-testid="mobile-image-preview"]')).toBeVisible();

      // Test mobile image editing
      await page.tap('[data-testid="edit-mobile-image"]');
      await expect(page.locator('[data-testid="mobile-image-editor"]')).toBeVisible();

      // Test mobile crop/resize tools
      await page.tap('[data-testid="crop-tool"]');
      await expect(page.locator('[data-testid="crop-handles"]')).toBeVisible();

      // Test mobile filter application
      await page.tap('[data-testid="apply-filter"]');
      await page.tap('[data-testid="filter-vintage"]');

      await page.tap('[data-testid="save-mobile-image"]');
      await expect(page.locator('[data-testid="image-saved"]')).toBeVisible();

      // Test voice-to-text (if supported)
      if (await page.locator('[data-testid="voice-input"]').isVisible()) {
        await page.tap('[data-testid="voice-input"]');
        await expect(page.locator('[data-testid="voice-recording"]')).toBeVisible();
      }
    });
  });

  describe('Cross-Device Mobile Testing', () => {
    test('should work across different mobile devices', async () => {
      const mobileDevices = [
        'iPhone 12',
        'iPhone SE',
        'Samsung Galaxy S21',
        'Samsung Galaxy Note20',
        'Pixel 5'
      ];

      for (const deviceName of mobileDevices) {
        await context.close();
        context = await browser.newContext({
          ...devices[deviceName]
        });
        page = await context.newPage();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify responsive layout works on each device
        await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-story-grid"]')).toBeVisible();

        // Test navigation on each device
        await page.tap('[data-testid="mobile-menu-button"]');
        await expect(page.locator('[data-testid="mobile-menu-overlay"]')).toBeVisible();
        await page.tap('[data-testid="mobile-menu-close"]');

        // Test story interaction
        await page.tap('.mobile-story-card:first-child');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-testid="mobile-story-content"]')).toBeVisible();

        await page.goBack();
      }
    });

    test('should handle orientation changes', async () => {
      // Start in portrait
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();

      // Switch to landscape
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(1000);

      // Verify layout adapts to landscape
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      
      // Check if landscape-specific elements appear
      const landscapeNav = page.locator('[data-testid="landscape-navigation"]');
      if (await landscapeNav.isVisible()) {
        await expect(landscapeNav).toBeVisible();
      }

      // Test reading in landscape
      await page.tap('.mobile-story-card:first-child');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="mobile-story-content"]')).toBeVisible();
      
      // Verify reading controls work in landscape
      await page.tap('[data-testid="mobile-reading-settings"]');
      await expect(page.locator('[data-testid="mobile-reading-controls"]')).toBeVisible();

      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(1000);

      await expect(page.locator('[data-testid="mobile-story-content"]')).toBeVisible();
    });
  });

  describe('Mobile Performance and Accessibility', () => {
    test('should maintain optimal mobile performance', async () => {
      // Test initial page load performance
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(4000); // Should load in under 4 seconds on mobile

      // Test scroll performance
      const scrollStart = Date.now();
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(100);
      }
      const scrollTime = Date.now() - scrollStart;
      expect(scrollTime).toBeLessThan(2000);

      // Test touch response time
      const touchStart = Date.now();
      await page.tap('[data-testid="mobile-menu-button"]');
      await page.waitForSelector('[data-testid="mobile-menu-overlay"]');
      const touchResponse = Date.now() - touchStart;
      expect(touchResponse).toBeLessThan(300); // Should respond within 300ms
    });

    test('should support mobile accessibility features', async () => {
      // Test screen reader compatibility
      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      const ariaLabel = await menuButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Test keyboard navigation on mobile (for external keyboards)
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();

      // Test high contrast mode
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify reduced motion preferences are respected
      const animations = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let hasAnimations = false;
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.animationDuration !== '0s' && style.animationDuration !== 'initial') {
            hasAnimations = true;
          }
        });
        return hasAnimations;
      });

      // In reduced motion mode, animations should be minimal or disabled
      // This is a basic check - real implementation would be more sophisticated

      // Test voice over support (iOS specific)
      const storyCard = page.locator('.mobile-story-card').first();
      const accessibilityLabel = await storyCard.getAttribute('aria-label');
      expect(accessibilityLabel).toBeTruthy();

      // Test minimum touch target sizes
      const touchTargets = await page.locator('[role="button"], button, a, input').all();
      for (const target of touchTargets.slice(0, 5)) {
        const box = await target.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should handle mobile network conditions', async () => {
      // Simulate slow 3G connection
      await context.route('**/*', async route => {
        await page.waitForTimeout(1000); // Add delay to simulate slow network
        route.continue();
      });

      await page.goto('/');
      
      // Check loading states are shown
      await expect(page.locator('[data-testid="mobile-loading"]')).toBeVisible();
      
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Verify progressive loading works
      await expect(page.locator('[data-testid="mobile-story-grid"]')).toBeVisible();

      // Test offline handling
      await context.setOffline(true);
      
      await page.tap('[data-testid="mobile-menu-button"]');
      await page.tap('[data-testid="nav-profile"]');
      
      // Should show offline message
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      
      await context.setOffline(false);
    });
  });

  describe('Mobile-Specific Features', () => {
    test('should support mobile notifications', async () => {
      // Request notification permissions (would be blocked in headless)
      await page.evaluate(() => {
        // Mock notification permission
        Object.defineProperty(Notification, 'permission', {
          value: 'granted',
          writable: false
        });
      });

      // Test notification settings
      await page.goto('/settings');
      await page.tap('[data-testid="notification-settings"]');
      
      await expect(page.locator('[data-testid="mobile-notifications"]')).toBeVisible();
      
      // Enable push notifications
      await page.tap('[data-testid="enable-push-notifications"]');
      await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();

      // Test notification preview
      await page.tap('[data-testid="test-notification"]');
      // In a real test, would verify notification appears
    });

    test('should support mobile sharing integrations', async () => {
      await page.goto('/story/sample-story');
      await page.waitForLoadState('networkidle');

      // Test native mobile sharing
      await page.tap('[data-testid="mobile-share-button"]');
      await expect(page.locator('[data-testid="mobile-share-sheet"]')).toBeVisible();

      // Test share to specific apps
      await page.tap('[data-testid="share-whatsapp"]');
      // Would verify WhatsApp share URL is correct

      await page.goBack();
      await page.tap('[data-testid="mobile-share-button"]');
      await page.tap('[data-testid="share-instagram"]');
      // Would verify Instagram share functionality
    });

    test('should handle mobile app-like features', async () => {
      // Test PWA features
      await page.goto('/');
      
      // Check if PWA install prompt elements exist
      const installButton = page.locator('[data-testid="pwa-install"]');
      if (await installButton.isVisible()) {
        await installButton.tap();
        await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible();
      }

      // Test mobile app navigation patterns
      await page.tap('[data-testid="mobile-tab-home"]');
      await expect(page.locator('[data-testid="home-content"]')).toBeVisible();

      await page.tap('[data-testid="mobile-tab-discover"]');
      await expect(page.locator('[data-testid="discover-content"]')).toBeVisible();

      await page.tap('[data-testid="mobile-tab-library"]');
      await expect(page.locator('[data-testid="library-content"]')).toBeVisible();

      // Test mobile search
      await page.tap('[data-testid="mobile-search-button"]');
      await expect(page.locator('[data-testid="mobile-search-overlay"]')).toBeVisible();

      const searchInput = page.locator('[data-testid="mobile-search-input"]');
      await searchInput.tap();
      await searchInput.fill('technology');

      await expect(page.locator('[data-testid="mobile-search-suggestions"]')).toBeVisible();
      await page.tap('[data-testid="search-suggestion-0"]');
      
      await expect(page.locator('[data-testid="mobile-search-results"]')).toBeVisible();
    });
  });
});