# 🚀 MadLab IDE Pro - Production Deployment Guide

## 📋 Prerequisites

- Node.js 18+
- pnpm 9+
- Production server (VPS, cloud, etc.)
- Domain name (optional but recommended)

## 🔧 Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="MadLab IDE Pro"
NEXT_PUBLIC_APP_VERSION=0.1.0

# Data Provider API Keys (Required for production)
POLYGON_API_KEY=your_polygon_api_key_here
ALPACA_API_KEY=your_alpaca_api_key_here
ALPACA_SECRET_KEY=your_alpaca_secret_key_here
ALPACA_PAPER_TRADING=true

# AI/LLM Configuration (Optional - for AI agent features)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Collaboration & WebSocket (Optional - for real-time features)
WORKSPACE_SYNC_URL=ws://localhost:3001
WORKSPACE_SYNC_API_KEY=your_workspace_sync_api_key_here

# Security & Performance
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS=10
```

## 🏗️ Build & Deploy

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build for Production

```bash
pnpm run build
```

### 3. Start Production Server

```bash
pnpm start
```

### 4. (Optional) Use PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "madlab-ide" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🌐 Production Server Configuration

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/HTTPS Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔒 Security Checklist

- [ ] Environment variables are properly set
- [ ] API keys are secured and not exposed in client code
- [ ] HTTPS is enabled
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Input validation is enabled
- [ ] Error messages don't expose sensitive information

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check application status
curl http://localhost:3000/api/health

# Check build status
pnpm run typecheck
pnpm run lint
```

### Performance Monitoring

- Monitor bundle sizes
- Track API response times
- Monitor memory usage
- Set up error tracking (Sentry)

### Regular Maintenance

- Update dependencies monthly
- Monitor security advisories
- Backup configuration files
- Review and rotate API keys

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Clear `.next` cache: `rm -rf .next`
   - Verify all dependencies are installed

2. **Runtime Errors**
   - Check environment variables
   - Verify API key permissions
   - Check server logs

3. **Performance Issues**
   - Enable compression in webpack config
   - Optimize bundle splitting
   - Monitor API rate limits

## 📞 Support

For deployment issues:

1. Check the logs: `pm2 logs madlab-ide`
2. Verify environment configuration
3. Test locally first: `pnpm run dev`
4. Check GitHub issues for known problems

---

**Happy Trading! 📈**

