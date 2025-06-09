# BINK Logo Usage Summary

## Current Logo Configuration

### 📁 **logo.png** - Visible Header/Banner Logo
**Usage**: Main logo displayed in headers, banners, and navigation
**Path**: `./logo.png` (relative path)
**Files using this**:
- `index.html` - Landing page header
- `dashboard.html` - Dashboard header
- `login.html` - Login page header
- `signup.html` - Signup page header
- `pricing.html` - Pricing page header
- `bio-editor.html` - Bio editor header
- `analytics.html` - Analytics page header
- `admin.html` - Admin page header
- `tokens.html` - Tokens page header

### 🔖 **logo1.png** - Browser Favicon (Tab Icon)
**Usage**: Browser tab icon, bookmarks, mobile home screen icon
**Path**: `/logo1.png` (absolute path)
**Files using this**:
- All HTML files in `<head>` section for favicon
- Template preview files for favicon
- Fallback URL: `https://adeledevgit.github.io/bink/logo1.png`

## HTML Configuration Examples

### Favicon Configuration (logo1.png):
```html
<!-- Favicon configuration for better browser compatibility -->
<link rel="icon" type="image/png" sizes="32x32" href="/logo1.png">
<link rel="icon" type="image/png" sizes="16x16" href="/logo1.png">
<link rel="shortcut icon" href="/logo1.png">
<link rel="apple-touch-icon" href="/logo1.png">
<!-- Fallback favicon from GitHub Pages -->
<link rel="icon" type="image/png" href="https://adeledevgit.github.io/bink/logo1.png">
```

### Header Logo Configuration (logo.png):
```html
<div class="logo-container-header">
    <a href="dashboard.html">
        <img src="./logo.png" alt="BINK Logo">
    </a>
</div>
```

## Vercel Deployment Configuration

### vercel.json includes both files:
```json
{
  "builds": [
    { "src": "logo.png", "use": "@vercel/static" },
    { "src": "logo1.png", "use": "@vercel/static" },
    // ... other configurations
  ]
}
```

## File Purposes

| File | Purpose | Where Visible | Path Type |
|------|---------|---------------|-----------|
| `logo.png` | Main brand logo | Headers, banners, navigation | Relative (`./logo.png`) |
| `logo1.png` | Browser favicon | Browser tabs, bookmarks, mobile icons | Absolute (`/logo1.png`) |

## Why Two Different Files?

1. **Different Contexts**: Header logos and favicons serve different purposes
2. **Size Optimization**: Favicons are typically smaller and optimized for small sizes
3. **Browser Compatibility**: Favicons have specific requirements and formats
4. **Deployment Flexibility**: Allows different optimization strategies for each use case

## Troubleshooting

### If Header Logo Doesn't Show:
- Check if `logo.png` exists in root directory
- Verify relative path `./logo.png` is correct
- Check file permissions and size

### If Favicon Doesn't Show:
- Check if `logo1.png` exists in root directory
- Verify absolute path `/logo1.png` is accessible
- Clear browser cache (favicons are heavily cached)
- Test fallback URL: `https://adeledevgit.github.io/bink/logo1.png`

## Quick Reference

**Need to update the main logo?** → Replace `logo.png`
**Need to update the browser icon?** → Replace `logo1.png`
**Both not showing on Vercel?** → Check vercel.json deployment configuration

## Deployment Checklist

- [ ] Both `logo.png` and `logo1.png` exist in root directory
- [ ] `vercel.json` includes both files in builds
- [ ] Header logos use `./logo.png`
- [ ] Favicons use `/logo1.png`
- [ ] Fallback favicon URL is accessible
- [ ] Clear browser cache after deployment
