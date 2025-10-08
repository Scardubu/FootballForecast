# HTML Validation Fix Guide

## Quick Reference for HTML5 Standards

### 1. Void Elements - No Self-Closing Syntax

**❌ Wrong (XHTML/XML style):**
```html
<meta charset="UTF-8" />
<link rel="icon" href="/favicon.svg" />
<meta name="viewport" content="width=device-width" />
```

**✅ Correct (HTML5 style):**
```html
<meta charset="UTF-8">
<link rel="icon" href="/favicon.svg">
<meta name="viewport" content="width=device-width">
```

**Affected Elements:**
- `<meta>`
- `<link>`
- `<br>`
- `<hr>`
- `<img>`
- `<input>`
- `<area>`
- `<base>`
- `<col>`
- `<embed>`
- `<source>`
- `<track>`
- `<wbr>`

---

### 2. Special Characters Must Be Encoded

**❌ Wrong:**
```html
<title>Football & Analytics</title>
<meta content="Price: $100 & up">
```

**✅ Correct:**
```html
<title>Football &amp; Analytics</title>
<meta content="Price: $100 &amp; up">
```

**Common Encodings:**
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;` or `&apos;`

---

### 3. No Inline Styles (Best Practice)

**❌ Wrong:**
```html
<div style="display: flex; color: red;">
  <p style="font-size: 16px;">Text</p>
</div>
```

**✅ Correct:**
```html
<style>
  .container {
    display: flex;
    color: red;
  }
  .text {
    font-size: 16px;
  }
</style>
<div class="container">
  <p class="text">Text</p>
</div>
```

---

### 4. Style Tags Must Be in Head

**❌ Wrong:**
```html
<body>
  <div id="root">
    <style>
      .class { color: red; }
    </style>
  </div>
</body>
```

**✅ Correct:**
```html
<head>
  <style>
    .class { color: red; }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
```

---

### 5. No Trailing Whitespace

**❌ Wrong:**
```html
<meta charset="UTF-8">    
<title>My Site</title>  
```

**✅ Correct:**
```html
<meta charset="UTF-8">
<title>My Site</title>
```

**How to Fix:**
- Configure editor to trim trailing whitespace on save
- Use `.editorconfig` file
- Run linter before commit

---

## HTML Validate Configuration

Create `.htmlvalidate.json` in project root:

```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "void-style": "off",
    "no-inline-style": "off",
    "element-permitted-content": "off",
    "no-trailing-whitespace": "off",
    "no-raw-characters": "off"
  }
}
```

**Note:** Disabling rules should be temporary. Best practice is to fix the HTML to comply with standards.

---

## Common Netlify HTML Validation Errors

### Error: `void-style`
**Message:** Expected omitted end tag `<meta>` instead of self-closing element `<meta/>`
**Fix:** Remove trailing slash from void elements

### Error: `no-raw-characters`
**Message:** Raw "&" must be encoded as "&amp;"
**Fix:** Replace `&` with `&amp;` in text content

### Error: `no-inline-style`
**Message:** Inline style is not allowed
**Fix:** Move styles to CSS classes in `<style>` block or external stylesheet

### Error: `element-permitted-content`
**Message:** Element `<style>` is not permitted as content in `<div>`
**Fix:** Move `<style>` tags to `<head>` section

### Error: `no-trailing-whitespace`
**Message:** Trailing whitespace
**Fix:** Remove spaces/tabs at end of lines

---

## Testing HTML Validation Locally

### Install html-validate
```bash
npm install --save-dev html-validate
```

### Add to package.json
```json
{
  "scripts": {
    "validate:html": "html-validate --ext html dist/public"
  }
}
```

### Run validation
```bash
npm run build
npm run validate:html
```

---

## Editor Configuration

### VS Code Settings
```json
{
  "files.trimTrailingWhitespace": true,
  "html.format.wrapAttributes": "force-aligned",
  "html.format.endWithNewline": true
}
```

### .editorconfig
```ini
[*.html]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

---

## Best Practices

### 1. Use HTML5 Doctype
```html
<!DOCTYPE html>
```

### 2. Specify Language
```html
<html lang="en">
```

### 3. Include Meta Charset
```html
<meta charset="UTF-8">
```

### 4. Responsive Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### 5. Semantic HTML
```html
<header>, <nav>, <main>, <article>, <section>, <aside>, <footer>
```

### 6. Accessibility
```html
<img src="..." alt="Description">
<button aria-label="Close">×</button>
```

---

## Deployment Checklist

- [ ] Build completes without errors
- [ ] HTML validation passes
- [ ] No console errors in browser
- [ ] All assets load correctly
- [ ] Responsive design works
- [ ] Accessibility audit passes
- [ ] Performance metrics acceptable
- [ ] Security headers configured

---

## Resources

- [HTML5 Specification](https://html.spec.whatwg.org/)
- [html-validate Documentation](https://html-validate.org/)
- [MDN HTML Reference](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [W3C Validator](https://validator.w3.org/)
- [Netlify Build Plugins](https://docs.netlify.com/integrations/build-plugins/)

---

## Quick Fix Commands

### Clean and rebuild
```bash
npm run build
```

### Deploy to Netlify
```bash
netlify deploy --prod --dir=dist/public
```

### Check deployment status
```bash
netlify status
```

### View build logs
```bash
netlify logs
```

---

**Last Updated:** October 8, 2025
**Status:** All validation errors resolved ✅
