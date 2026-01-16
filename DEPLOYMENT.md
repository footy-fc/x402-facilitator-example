## 🚀 Quick Start
1. **Copy environment configuration:**
   ```bash
   cp env.production.example .env
   ```
2. **Update production values:**
   - Set your production private key
   - Update all URLs to your production domains
   - Configure your Revnet project ID and addresses
3. **Deploy services:**
   - Deploy facilitator to your hosting platform
   - Deploy provider to your hosting platform
   - Deploy web client to your hosting platform
## 🚂 Deploying to Railway (Step-by-Step)
1. **Create a Railway Account**
   - Go to [railway.app](https://railway.app) and sign up (GitHub login is easiest).
2. **Install Railway CLI (optional, but helpful)**
   - Run:  
   ```
   npm install -g railway
   ```
3. **Initialize Your Project**
   - In your project folder, run:  
   ```
   railway init
   ```
   - Follow the prompts to create a new project.
4. **Deploy Your App**
   - Run:  
   ```
   railway up
   ```
   - This will build and deploy your app. Railway will detect your Node.js app automatically.
5. **Set Environment Variables**
   - In the Railway dashboard, go to your project → “Variables”.
   - Add all required environment variables (e.g., `EVM_PRIVATE_KEY`, `BASE_URL`, etc.).
6. **Get Your Public URL**
   - After deployment, Railway will provide a public URL for your API.
7. **Test Your Endpoints**
   - Use `curl` or Postman to test `/health`, `/verify`, and `/settle`.
----
## 💸 Cost
   - Railway has a generous free tier (as of 2026):  
   - 500 hours/month of server runtime  
   - 1GB RAM, 1GB disk per project  
   - Free tier is usually enough for development, testing, and small production workloads.
   - Paid plans start if you need more resources or always-on uptime.
**For a minimal API like this, the free tier is likely sufficient unless you expect high traffic.**
Let me know if you want a ready-to-copy `.env.example` or more details on any step!
## 🚀 Deploying to Vercel (Step-by-Step)
1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com) and sign up (GitHub login is easiest).
2. **Install Vercel CLI (optional, but helpful)**
   - Run:
   ```
   npm install -g vercel
   ```
3. **Connect Your Project**
   - In your project folder, run:
   ```
   vercel
   ```
   - Follow the prompts to link or create a new project.
4. **Set Environment Variables**
   - In the Vercel dashboard, go to your project → “Settings” → “Environment Variables”.
   - Add all required environment variables (e.g., `EVM_PRIVATE_KEY`, `BASE_URL`, etc.).
5. **Deploy**
   - Run:
   ```
   vercel --prod
   ```
   - Or use the Vercel dashboard “Deploy” button.
6. **Get Your Public URL**
   - After deployment, Vercel will provide a public URL for your API.
7. **Test Your Endpoints**
   - Use `curl` or Postman to test `/api?health`, `/api/verify`, and `/api/settle`.
---
## 💸 Cost
   - Vercel has a generous free tier (as of 2026):
   - 100GB-hours/month of serverless function execution
   - 1000 serverless function executions/day
   - Free tier is usually enough for development, testing, and small production workloads.
   - Paid plans start if you need more resources or always-on uptime.
**For a minimal API like this, the free tier is likely sufficient unless you expect high traffic.**
# Production Deployment Guide

This guide covers deploying the x402 Facilitator Example to production environments.

## 🚀 Quick Start

1. **Copy environment configuration:**

   ```bash
   cp env.production.example .env
   ```

2. **Update production values:**

   - Set your production private key
   - Update all URLs to your production domains
   - Configure your Revnet project ID and addresses

3. **Deploy services:**
   - Deploy facilitator to your hosting platform
   - Deploy provider to your hosting platform
   - Deploy web client to your hosting platform

## 🔧 Environment Variables

### Required Variables

| Variable          | Description                        | Example                           |
| ----------------- | ---------------------------------- | --------------------------------- |
| `EVM_PRIVATE_KEY` | Private key for the escrow account | `0x1234...`                       |
| `FACILITATOR_URL` | URL where facilitator is deployed  | `https://facilitator.example.com` |
| `PROVIDER_URL`    | URL where provider is deployed     | `https://provider.example.com`    |
| `WEB_CLIENT_URL`  | URL where web client is deployed   | `https://client.example.com`      |
| `BASE_URL`        | Base URL for internal API calls    | `https://facilitator.example.com` |

### Optional Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Server port | `3000` |
| `NETWORK` | Blockchain network | `base` |
| `REVNET_PROJECT_ID` | Revnet project ID | `127` |
| `JB_MULTI_TERMINAL_ADDRESS` | JBMultiTerminal contract address | `0xdb9644369c79c3633cde70d2df50d827d7dc7dbc` |
| `USDC_CONTRACT_ADDRESS` | USDC contract address | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |


## 🏗️ Deployment Platforms




### Railway (Recommended)

1. **Deploy Facilitator/Verifier:**

   ```bash
   railway login
   railway init
   railway up
   ```

2. **Set environment variables in Railway dashboard**


### Docker Deployment (Facilitator/Verifier Only)

1. **Create Dockerfile:**

   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t x402-facilitator .
   docker run -p 3000:3000 --env-file .env x402-facilitator
   ```

## 🔐 Security Considerations

### Private Key Management

- **Never commit private keys to version control**
- Use secure key management services:
  - AWS Secrets Manager
  - Azure Key Vault
  - HashiCorp Vault
  - Environment variables (for simple deployments)


### CORS Configuration

Update CORS settings for production as needed for your use case. If no web client is used, you may allow all origins or restrict as appropriate.

### Rate Limiting

Consider adding rate limiting for production:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## 📊 Monitoring

### Health Checks

The facilitator provides health check endpoints:

- `GET /health` - Basic health check
- `GET /supported` - Supported payment kinds

### Logging

Configure logging for production:

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
        env:
          EVM_PRIVATE_KEY: ${{ secrets.EVM_PRIVATE_KEY }}
          FACILITATOR_URL: ${{ secrets.FACILITATOR_URL }}
```

## 🧪 Testing Production

1. **Health Check:**

   ```bash
   curl https://your-facilitator-domain.com/health
   ```

2. **Supported Networks:**

   ```bash
   curl https://your-facilitator-domain.com/supported
   ```


3. **End-to-End Test:**
   - Use API tools (curl, Postman) to test `/verify` and `/settle` endpoints
   - Test payment flow via Juicebox multiterminal

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors:**

   - Check `WEB_CLIENT_URL` environment variable
   - Verify CORS configuration

2. **Transaction Failures:**

   - Check gas price settings
   - Verify network configuration
   - Check private key permissions

3. **Connection Issues:**
   - Verify all URLs are accessible
   - Check firewall settings
   - Verify SSL certificates

### Debug Mode

Enable debug logging:

```bash
DEBUG=x402:* npm start
```

## 📚 Additional Resources

- [x402 Protocol Documentation](https://x402.org)
- [Juicebox Protocol](https://juicebox.money)
- [Revnet Documentation](https://docs.juicebox.money)
- [Base Network Documentation](https://docs.base.org)
