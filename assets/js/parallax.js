/**
 * Squarespace Parallax Effect - Local Implementation
 * Replicates the parallax scrolling behavior for background images
 *
 * How it works:
 * - .Parallax-item elements are positioned fixed with z-index: -1 (behind content)
 * - .Index-page-image elements inside have a parallax transform that moves slower than scroll
 * - This creates the illusion of depth/parallax as you scroll
 */

(function() {
  'use strict';

  // Configuration
  const PARALLAX_FACTOR = 0.5; // How fast images move relative to scroll (0.5 = half speed)
  const UPDATE_THROTTLE = 16; // ~60fps

  let ticking = false;
  let lastScrollY = 0;

  // Find all parallax items on page load
  const parallaxItems = [];

  function initParallax() {
    // Find all parallax containers
    const items = document.querySelectorAll('[data-parallax-item]');

    items.forEach((item) => {
      const image = item.querySelector('[data-parallax-image-wrapper]');
      if (!image) return;

      // Store initial positions from inline styles
      const itemStyle = item.getAttribute('style') || '';
      const topMatch = itemStyle.match(/top:\s*([0-9.]+)px/);
      const leftMatch = itemStyle.match(/left:\s*([0-9.]+)px/);

      const initialTop = topMatch ? parseFloat(topMatch[1]) : 0;
      const initialLeft = leftMatch ? parseFloat(leftMatch[1]) : 0;

      // Get initial item transform (CRITICAL: preserves horizontal offset like -1905px)
      const itemTransformMatch = itemStyle.match(/transform:\s*translate3d\(([^)]+)\)/);
      let initialItemX = 0;
      let initialItemY = 0;
      if (itemTransformMatch) {
        const parts = itemTransformMatch[1].split(',').map(p => parseFloat(p.trim()));
        initialItemX = parts[0] || 0;
        initialItemY = parts[1] || 0;
      }

      // Smart detection: Check if this background should be visible
      // If the parallax item has a data-parallax-id, find its associated section
      const parallaxId = item.getAttribute('data-parallax-id');
      let shouldAdjustForSection = false;
      let sectionOffsetTop = 0;

      if (parallaxId) {
        const section = document.querySelector(`[data-parallax-id="${parallaxId}"][data-parallax-original-element]`);

        // If section exists and the background is way off-screen, check if it should be visible
        if (section && Math.abs(initialItemX) >= window.innerWidth) {
          // Background is off-screen. Check if section is in normal document flow
          const sectionRect = section.getBoundingClientRect();
          sectionOffsetTop = section.offsetTop || 0;

          // If section is in the document (not hidden), background should likely be visible
          // This catches cases where Squarespace hides/shows backgrounds dynamically
          if (sectionOffsetTop >= 0 && sectionRect.height > 0) {
            console.log(`Parallax: Making background visible for section ${section.id || parallaxId}`);
            initialItemX = 0; // Make background visible
            shouldAdjustForSection = true;
          }
        }
      }

      // Get initial image transform
      const imageStyle = image.getAttribute('style') || '';
      const imageTransformMatch = imageStyle.match(/transform:\s*translate3d\(([^)]+)\)/);
      let initialImageY = 0;
      if (imageTransformMatch) {
        const parts = imageTransformMatch[1].split(',').map(p => parseFloat(p.trim()));
        if (parts.length >= 2) {
          initialImageY = parts[1];
        }
      }

      // If we adjusted the section for visibility, we need to adjust the image Y
      // to account for where the section is on the page
      if (shouldAdjustForSection && sectionOffsetTop > 0) {
        // The image Y should be adjusted so it appears correctly when scrolled to the section
        // Initial image Y should account for the parallax factor relative to section position
        initialImageY = -(sectionOffsetTop * PARALLAX_FACTOR);
        console.log(`Parallax: Adjusted image Y to ${initialImageY} for section at ${sectionOffsetTop}px`);
      }

      parallaxItems.push({
        element: item,
        image: image,
        initialTop: initialTop,
        initialLeft: initialLeft,
        initialItemX: initialItemX,  // Horizontal offset from transform
        initialImageY: initialImageY
      });

      // Set initial styles
      item.style.position = 'fixed';
      item.style.zIndex = '-1';
      item.style.willChange = 'transform';

      image.style.position = 'absolute';
      image.style.willChange = 'transform';
    });

    console.log(`Parallax initialized: ${parallaxItems.length} items`);
  }

  function updateParallax() {
    const scrollY = window.scrollY || window.pageYOffset;

    parallaxItems.forEach((item) => {
      // Calculate new positions
      const imageY = item.initialImageY + (scrollY * PARALLAX_FACTOR);

      // Apply transforms
      // Parent item: moves with scroll to stay fixed in viewport
      // CRITICAL: Use initialItemX to preserve horizontal offset (e.g., -1905px for hidden backgrounds)
      item.element.style.transform = `translate3d(${item.initialItemX}px, ${-scrollY}px, 0)`;
      item.element.style.top = `${item.initialTop}px`;

      // Image: parallax effect (moves slower than scroll)
      item.image.style.transform = `translate3d(0, ${imageY}px, 0)`;
    });

    ticking = false;
  }

  function requestUpdate() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParallax);
  } else {
    initParallax();
  }

  // Update on scroll
  window.addEventListener('scroll', requestUpdate, { passive: true });

  // Update on resize
  window.addEventListener('resize', () => {
    requestUpdate();
  }, { passive: true });

  // Initial update
  requestUpdate();

})();
