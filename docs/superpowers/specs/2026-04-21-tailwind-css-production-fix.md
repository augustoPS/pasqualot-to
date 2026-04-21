# Tailwind CSS Production Build Investigation & Fix

**Date:** 2026-04-21  
**Branch:** `css/tailwind-build-investigation`  
**Status:** Design Approved  
**Objective:** Understand and fix why Tailwind CSS classes are not being applied in production static builds while working correctly in dev server.

---

## Problem Statement

**Symptom:** Production site at pasqualo.to displays unstyled HTML (data is present, but no styling applied).  
**Dev behavior:** Local preview server renders all styles correctly using inline `<style>` tags.  
**Difference:** Dev uses embedded CSS, production uses external CSS file (`BaseLayout.Dwye_nI_.css`).  
**Current state:** External CSS file loads (200 status, 46KB), contains Tailwind classes, but they don't render.

**Root cause unknown.** Investigation needed to determine if issue is:
- Tailwind v4 + Vite plugin not generating classes for static output
- Astro/Vercel adapter CSS extraction configuration
- Content path scanning not finding template files
- CSS specificity or selector issue
- Missing configuration in build pipeline

---

## Technology Context

- **Tailwind CSS:** v4 (via `@tailwindcss/vite` plugin)
- **Config:** No explicit `tailwind.config.js` (using defaults)
- **Build tool:** Vite (Astro's build system)
- **Framework:** Astro 6 with `@astrojs/vercel` adapter
- **Output:** Static HTML files (no server-side rendering)
- **CSS delivery:** External linked stylesheet

---

## Investigation Plan

### Phase 1: Understand the CSS Pipeline

1. **Compare dev vs. production CSS generation**
   - Run `npm run build` and inspect the generated CSS file
   - Check what Vite/Tailwind output in dev mode (via browser DevTools)
   - Compare the two: which Tailwind utilities are present/missing?

2. **Verify CSS file contents**
   - Fetch production CSS file and search for specific classes used in HTML
   - Examples: `grid-cols-3`, `bottom-3`, `right-3`, `group-hover:scale`
   - Determine if classes exist in CSS or were never generated

3. **Check HTML/CSS linkage**
   - Verify `<link>` tag in production HTML points to correct CSS file
   - Confirm CSS file is being served with correct `Content-Type` header
   - Test if CSS loads without network errors in browser

### Phase 2: Root Cause Analysis

1. **Tailwind v4 + Vite plugin compatibility**
   - Review Tailwind v4 documentation for known SSG/static build issues
   - Check if Vite plugin properly generates utilities for static output
   - Verify content path configuration (Tailwind needs to know where templates are)

2. **Astro build pipeline**
   - Check how Astro processes CSS with `@astrojs/vercel` adapter
   - Determine if CSS extraction is working as expected
   - Look for any build warnings or errors related to CSS

3. **Vercel adapter specifics**
   - Test if issue is specific to Vercel adapter or general to static builds
   - Try building with default Astro static adapter to isolate the issue

### Phase 3: Test & Implement Fix

1. **Create explicit Tailwind configuration**
   - Generate `tailwind.config.js` with explicit content paths
   - Specify all template locations: `src/**/*.astro`, `src/**/*.tsx`, etc.
   - Configure for static build explicitly if needed

2. **Test CSS generation**
   - Rebuild after config changes
   - Verify Tailwind classes now appear in production CSS file
   - Check build logs for warnings

3. **Alternative approaches if needed**
   - If explicit config doesn't work, test alternative Vite configurations
   - Consider CSS import method changes if applicable
   - As fallback: move critical styles to inline (temporary workaround while debugging)

### Phase 4: Validate & Document

1. **Production validation**
   - Deploy changes to production
   - Verify styling renders correctly on homepage and 404 page
   - Test on multiple pages to ensure comprehensive fix

2. **Documentation**
   - Document root cause findings
   - Explain the fix and why it works
   - Add comments to `tailwind.config.js` for future maintainers

3. **Commit**
   - Create clean commit with findings and fix
   - Include explanation of investigation and solution

---

## Success Criteria

✅ Tailwind utility classes render in production CSS  
✅ Homepage and 404 page display with proper styling (fonts, colors, spacing, layout)  
✅ No changes required to HTML or component structure  
✅ Build process doesn't significantly slow down  
✅ Solution is maintainable and documented  
✅ Root cause is understood and explained

---

## Constraints & Assumptions

- **No downgrade:** Must stay on Tailwind v4
- **No rewrites:** Avoid rewriting components unless necessary
- **No breaking changes:** Fix should be backward compatible
- **Time unlimited:** No time constraints on investigation
- **Goal:** Understanding + maintainable fix (not just patch)

---

## Risks & Contingencies

**Risk:** Tailwind v4/Vite plugin has unfixable bug with Astro static builds  
**Contingency:** Switch to Approach B (embed CSS) or Approach C (hybrid solution)

**Risk:** Investigation takes 6+ hours with no resolution  
**Contingency:** Document findings, escalate to community, consider temporary inline-styles workaround

---

## Next Steps

1. **Phase 1 (Investigation):** Examine CSS pipeline and identify what's missing
2. **Phase 2 (Analysis):** Determine root cause from findings
3. **Phase 3 (Fix):** Implement solution based on root cause
4. **Phase 4 (Validation):** Test and document

---
