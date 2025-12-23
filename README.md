# Local AI Cat Website 🐱

A funky, retro-futuristic marketing website for Local AI Cat - built with pure HTML, CSS, and JavaScript.

## 🎨 Design Philosophy

- **Aesthetic**: Retro-futuristic feline tech meets playful professionalism
- **Typography**: Fredoka (display), Plus Jakarta Sans (body), JetBrains Mono (code)
- **Colors**: Warm oranges + cool purples + electric teals
- **Vibe**: Fun, cat-themed, privacy-focused, and offline-first

## 📁 File Structure

```
localaicat-site/
├── index.html          # Landing page with hero, features, download
├── privacy.html        # Privacy Policy (App Store requirement)
├── terms.html          # Terms of Service (App Store requirement)
├── support.html        # Support & FAQ page
├── style.css           # All styles with CSS animations
├── script.js           # Interactive features & chat widget
└── README.md           # This file
```

## ✨ Features

### Landing Page (`index.html`)
- Animated hero section with gradient text
- Interactive chat preview with typing animation
- 6 feature cards with hover effects
- Download section with App Store button
- Floating particle background
- Responsive design

### Interactive Chat Widget
- Canned responses for demo purposes
- Cat personality in responses
- Easy to hook up to real backend later (see `script.js`)
- Smooth animations and transitions

### Legal Pages
- **Privacy Policy**: Comprehensive, privacy-first policy emphasizing local-only processing
- **Terms of Service**: Fair, clear terms for app usage
- **Support**: FAQ section + contact methods

### Special Touches
- Cat paw cursor (🐾)
- Floating emoji particles
- Smooth scroll animations
- Easter egg (click logo 5 times!)
- Console messages for developers
- Mobile-responsive design

## 🚀 Deployment to GitHub Pages

### Option 1: Deploy from Separate Repository (Recommended)

1. **Create a new repository** named `localaicat-site` or `localaicat.github.io`

2. **Copy the files**:
   ```bash
   # From the root of Local-AI-Chat repo
   cp -r localaicat-site/* /path/to/new/localaicat-site-repo/
   ```

3. **Push to GitHub**:
   ```bash
   cd /path/to/new/localaicat-site-repo/
   git init
   git add .
   git commit -m "Initial commit: Local AI Cat website"
   git branch -M main
   git remote add origin https://github.com/yourusername/localaicat-site.git
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - Go to repository Settings > Pages
   - Source: Deploy from branch
   - Branch: `main`, folder: `/ (root)`
   - Click Save

5. **Site will be live at**: `https://yourusername.github.io/localaicat-site/`

### Option 2: Deploy from Subdirectory (This Repo)

1. **Create a `gh-pages` branch**:
   ```bash
   git checkout --orphan gh-pages
   git reset --hard
   git checkout main -- localaicat-site
   mv localaicat-site/* .
   rmdir localaicat-site
   git add .
   git commit -m "Deploy website to GitHub Pages"
   git push origin gh-pages
   ```

2. **Enable GitHub Pages**:
   - Go to Settings > Pages
   - Source: Deploy from branch
   - Branch: `gh-pages`, folder: `/ (root)`
   - Click Save

## 🌐 Custom Domain Setup (localaicat.com)

### 1. Configure DNS (at your domain registrar)

Add these DNS records:

```
Type    Name    Value
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
CNAME   www     yourusername.github.io
```

### 2. Configure GitHub Pages

1. Go to repository Settings > Pages
2. Under "Custom domain", enter: `localaicat.com`
3. Click Save
4. Check "Enforce HTTPS" (wait for certificate to provision)

### 3. Wait for DNS Propagation

DNS changes can take 24-48 hours to fully propagate. Check status:
```bash
dig localaicat.com +short
```

## 🎨 Customization Guide

### Colors

Edit CSS variables in `style.css`:

```css
:root {
    --primary: #FF6B35;        /* Main orange */
    --secondary: #5B21B6;      /* Purple */
    --accent: #06B6D4;         /* Teal */
    /* ... more colors */
}
```

### Chat Responses

Edit canned responses in `script.js`:

```javascript
const cannedResponses = {
    'hello': 'Your custom response here!',
    // Add more responses
};
```

### Fonts

Current fonts (from Google Fonts):
- **Fredoka**: Rounded, playful display font
- **Plus Jakarta Sans**: Modern, clean body font
- **JetBrains Mono**: Code/tech monospace font

To change fonts, update the Google Fonts link in HTML files and CSS variables.

### Content

- **App Store Link**: Update the App Store button href in `index.html`
- **Email Addresses**: Search and replace placeholder emails (privacy@, support@, legal@)
- **GitHub Link**: Update GitHub repository links
- **Legal Text**: Review and customize Privacy Policy and Terms of Service

## 🔧 Local Development

1. **Simple HTTP Server** (Python 3):
   ```bash
   cd localaicat-site
   python3 -m http.server 8000
   ```
   Visit: `http://localhost:8000`

2. **Node.js Server**:
   ```bash
   npx http-server localaicat-site -p 8000
   ```

3. **VS Code Live Server**:
   - Install "Live Server" extension
   - Right-click `index.html` > "Open with Live Server"

## 📱 Mobile Testing

Test responsive design:
- Chrome DevTools: Toggle device toolbar (Cmd+Shift+M)
- Responsive breakpoints: 1024px, 768px, 480px
- Test on real devices for best results

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios meet WCAG AA standards
- Alt text for decorative emoji (future improvement)

## 🐛 Known Issues / Future Improvements

- [ ] Add favicon and app icons
- [ ] Add Open Graph meta tags for social sharing
- [ ] Add actual App Store link when app is published
- [ ] Replace placeholder email addresses
- [ ] Add sitemap.xml for SEO
- [ ] Add robots.txt
- [ ] Consider adding analytics (Google Analytics, Plausible, etc.)
- [ ] Add blog section for updates/news
- [ ] Create downloadable press kit

## 📄 License

This website code is part of the Local AI Chat project. See main repository license.

## 🤝 Contributing

Found a bug? Have a suggestion?
- Open an issue in the main repository
- Submit a pull request
- Email: support@localaicat.com

---

Made with 💜 and 🐱 by the Local AI Cat team
