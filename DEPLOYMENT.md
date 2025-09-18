# 🚀 Deployment Guide

## Quick Deployment Steps

### 1. Google Apps Script Setup (Critical)

This is the **most important step** and the root cause of the original 411 error.

1. **Create Google Apps Script Project**
   - Go to https://script.google.com/
   - Click "New Project"
   - Replace default code with the contents of `Code.gs`
   - Create `appsscript.json` with the provided content

2. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Select "Web app" as type
   - Set "Execute as": Me (your-email@gmail.com)
   - Set "Who has access": Anyone
   - Click "Deploy"
   - **Copy the Web App URL** - it should end with `/exec`

3. **Test the Deployment**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"tabName":"test","item":"apple","qty":1,"pricePerKg":100,"status":"owes"}' \
     YOUR_WEB_APP_URL
   ```

### 2. Render Deployment

1. **Connect Repository**
   - Fork this repository to your GitHub account
   - Go to https://render.com/ and sign up/login
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - Name: `ara-voice` (or your preferred name)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free (or your choice)

3. **Set Environment Variables**
   ```
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   SECRET_KEY=pickle prince pepsi
   REQUEST_TIMEOUT=10000
   LOG_LEVEL=info
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be available at `https://your-app-name.onrender.com`

### 3. Alternative Deployment Options

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set GOOGLE_APPS_SCRIPT_URL=your_url_here
heroku config:set SECRET_KEY="pickle prince pepsi"

# Deploy
git push heroku main
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

## Root Cause of 411 Error Fixed

The original **411 Length Required** error was caused by:

1. **Missing Google Apps Script Implementation**: The provided URL was just a placeholder
2. **Improper Web App Deployment**: The Google Apps Script wasn't deployed with correct permissions
3. **Missing doPost Function**: The script lacked the proper HTTP POST handler
4. **Incorrect Content-Type Handling**: The original script didn't properly handle JSON requests

**The fix includes:**
- Complete Google Apps Script implementation with proper error handling
- Correct Web App deployment configuration (`appsscript.json`)
- Robust `doPost` function that handles JSON parsing and validation
- Proper response formatting with appropriate MIME types
- Detailed logging for debugging

## Production Checklist

- [ ] Google Apps Script deployed and tested
- [ ] Environment variables configured
- [ ] HTTPS enabled (required for Speech Recognition API)
- [ ] Error monitoring set up
- [ ] Backup of Google Apps Script code
- [ ] Rate limiting implemented (if needed)
- [ ] Custom domain configured (optional)

## Monitoring

### Health Check Endpoint
Your app exposes a health check at `/health`:
```
GET https://your-app.onrender.com/health
```

### Log Monitoring
Check your deployment platform's logs for:
- Voice command processing
- Google Apps Script communication
- Error messages and stack traces

### Google Apps Script Logs
Monitor execution logs in the Google Apps Script editor:
- Go to your Apps Script project
- Click "Executions" to see recent runs
- Check for errors or successful executions