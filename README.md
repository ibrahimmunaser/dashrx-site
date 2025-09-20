# DashRx Pharmacy Partner Website

A fast, secure, one-page marketing website for DashRx that targets pharmacies in Metro Detroit. The site explains our value proposition, lists features, and collects pharmacy information via a quote form that emails directly to the DashRx team.

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn
- Gmail account with App Password (for email functionality)

### Installation

1. **Clone or download the project:**
   ```bash
   git clone <repository-url>
   cd dashrx-site
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your email configuration (see [Email Setup](#email-setup) below).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📧 Email Setup

The quote form emails submissions to `dashrx10@gmail.com`. You need to configure email delivery:

### Option 1: Gmail App Password (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App Passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password

3. **Update your `.env` file:**
   ```
   MAIL_PROVIDER=gmail
   MAIL_USER=Dashrx10@gmail.com
   MAIL_APP_PASS=your_16_character_app_password
   ```

### Option 2: SendGrid (Alternative)

1. **Sign up for SendGrid** and get your API key
2. **Update your `.env` file:**
   ```
   MAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your_sendgrid_api_key
   ```

### Option 3: Mailgun (Alternative)

1. **Sign up for Mailgun** and configure your domain
2. **Update your `.env` file:**
   ```
   MAIL_PROVIDER=mailgun
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_mailgun_domain
   ```

## 🧪 Testing

Run the test suite to verify functionality:

```bash
npm test
```

The tests cover:
- ✅ Form validation (required fields, email format, phone format)
- ✅ Security measures (honeypot, rate limiting, spam detection)
- ✅ API endpoints and error handling
- ✅ Static file serving and SEO assets

## 📁 Project Structure

```
dashrx-site/
├── public/                 # Static assets
│   ├── favicon.ico        # Site icon (placeholder)
│   ├── og-image.png      # Social media image (placeholder)
│   ├── robots.txt        # Search engine directives
│   ├── sitemap.xml       # Site structure for SEO
│   ├── styles.css        # Main stylesheet
│   └── script.js         # Frontend JavaScript
├── views/                 # HTML templates
│   ├── index.html        # Main landing page
│   ├── success.html      # Quote submission success
│   ├── error.html        # Error fallback page
│   ├── privacy.html      # Privacy policy
│   └── terms.html        # Terms of service
├── server/               # Backend code
│   ├── server.js         # Express application
│   ├── mailer.js         # Email service
│   ├── validators.js     # Input validation
│   ├── security.js       # Security configuration
│   ├── rateLimit.js      # Rate limiting
│   └── test/
│       └── quoteRoute.test.js  # Test suite
├── package.json          # Dependencies and scripts
├── env.example          # Environment variables template
└── README.md            # This file
```

## 🌍 Deployment

### Option 1: Render (Recommended)

1. **Connect your repository to Render:**
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect your GitHub repository

2. **Configure the service:**
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server/server.js`
   - **Node Version:** 18 (or latest LTS)

3. **Set environment variables:**
   Add all variables from your `.env` file in Render's environment section.

4. **Deploy:**
   Render will automatically deploy when you push to your main branch.

### Option 2: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set environment variables:**
   ```bash
   vercel env add MAIL_PROVIDER
   vercel env add MAIL_USER
   vercel env add MAIL_APP_PASS
   ```

### Option 3: Any Node.js Hosting

1. **Upload files** to your hosting provider
2. **Install dependencies:** `npm install`
3. **Set environment variables** in your hosting panel
4. **Start the application:** `node server/server.js`

### Environment Variables for Production

```
NODE_ENV=production
PORT=3000
MAIL_PROVIDER=gmail
MAIL_USER=Dashrx10@gmail.com
MAIL_APP_PASS=your_app_password
ANALYTICS_ENABLED=false
```

## 🔒 Security Features

- **Helmet.js** - Security headers and OWASP protection
- **Rate Limiting** - Prevents spam and abuse (5 requests/minute)
- **Input Validation** - Server-side validation of all form data
- **Honeypot Field** - Hidden spam trap
- **CSRF Protection** - Via SameSite cookies and form tokens
- **XSS Prevention** - Input sanitization and CSP headers
- **No PHI Collection** - Clear warnings against patient information

## 📈 Performance Optimization

- **Vanilla JavaScript** - No heavy frameworks, faster loading
- **Optimized CSS** - Mobile-first, minimal unused styles
- **CDN Ready** - Static assets can be served from CDN
- **Lazy Loading** - Images and non-critical resources
- **Compression** - Gzip enabled for text assets

### Lighthouse Targets
- **Performance:** 95+
- **Accessibility:** 95+
- **Best Practices:** 95+
- **SEO:** 95+

## ♿ Accessibility Features

- **WCAG AA Compliance** - Color contrast and keyboard navigation
- **Semantic HTML** - Proper landmarks and structure
- **Screen Reader Support** - ARIA labels and live regions
- **Keyboard Navigation** - Full functionality without mouse
- **Focus Management** - Visible focus indicators
- **Skip Links** - Quick navigation for assistive technology

## 🎨 Brand System

### Colors
- **Primary:** `#15899D` (Teal Blue)
- **Primary Dark:** `#1F8397`
- **Secondary:** `#4F9AAA`
- **Accent 1:** `#9DCACF`
- **Accent 2:** `#88B8C4`
- **Text:** `#606768`
- **Background:** `#F9FBFB`

### Typography
- **Font:** Inter (Google Fonts)
- **System Fallback:** -apple-system, BlinkMacSystemFont, Segoe UI

### Copy Guidelines
Use these exact phrases as specified in the requirements:

- **Tagline:** "The Missing Link Between You and Your Patients"
- **Phone:** (313) 333-2133
- **Email:** dashrx10@gmail.com
- **Service Area:** "Serving Metro Detroit Area!"

## 🔧 Troubleshooting

### Email Not Sending
1. **Check Gmail App Password:**
   - Ensure 2FA is enabled
   - Generate a new App Password
   - Use the exact 16-character password

2. **Check Environment Variables:**
   ```bash
   node -e "console.log(process.env.MAIL_USER, process.env.MAIL_APP_PASS)"
   ```

3. **Test Email Configuration:**
   The test suite includes email configuration checks.

### Form Validation Issues
1. **Check browser console** for JavaScript errors
2. **Verify required fields** are properly marked
3. **Test honeypot field** is hidden and empty
4. **Check rate limiting** if submissions are blocked

### Performance Issues
1. **Enable compression** on your hosting provider
2. **Use a CDN** for static assets
3. **Optimize images** (favicon.ico, og-image.png)
4. **Monitor Core Web Vitals** in Google Search Console

### SSL/HTTPS Issues
1. **Force HTTPS redirect** in hosting settings
2. **Update canonical URLs** in HTML meta tags
3. **Check mixed content warnings** in browser console

## 📝 Content Management

### Updating Contact Information
Edit these files when contact details change:
- `views/index.html` - Main page contact sections
- `views/success.html` - Contact fallback
- `views/error.html` - Contact fallback
- `README.md` - This file

### Adding New Pages
1. Create HTML file in `views/` directory
2. Add route in `server/server.js`
3. Update `public/sitemap.xml`
4. Add navigation links if needed

### SEO Updates
- **Meta tags:** Edit in HTML `<head>` sections
- **JSON-LD:** Update structured data in `views/index.html`
- **Sitemap:** Modify `public/sitemap.xml`
- **Robots.txt:** Adjust `public/robots.txt`

## 🆘 No-Backend Option (Emergency Fallback)

If the backend fails, you can use Formspree as a fallback:

1. **Sign up for Formspree** at [formspree.io](https://formspree.io)
2. **Replace form action:**
   ```html
   <form action="https://formspree.io/f/your-form-id" method="POST">
   ```
3. **Add hidden fields:**
   ```html
   <input type="hidden" name="_to" value="dashrx10@gmail.com">
   <input type="hidden" name="_subject" value="New Pharmacy Quote Request">
   ```

## 📞 Support

For technical issues with this website:

- **Email:** [dashrx10@gmail.com](mailto:dashrx10@gmail.com)
- **Phone:** [(313) 333-2133](tel:+13133332133)

For business inquiries, use the quote form on the website.

## 📄 License

Copyright © 2024 DashRx. All rights reserved.

---

**Built with ❤️ for Metro Detroit Pharmacies**
