# Troubleshooting Guide

This guide helps resolve common issues with MTG Screen-to-Deck. For security issues, see [SECURITY.md](./SECURITY.md).

## Table of Contents

1. [OCR Issues](#ocr-issues)
2. [Discord Bot Problems](#discord-bot-problems)
3. [Web Application Errors](#web-application-errors)
4. [API and Backend Issues](#api-and-backend-issues)
5. [Installation Problems](#installation-problems)
6. [Performance Issues](#performance-issues)
7. [Export Format Problems](#export-format-problems)
8. [Environment Configuration](#environment-configuration)

---

## OCR Issues

### Problem: OCR returns fewer than 75 cards

**Symptoms:**
- Missing cards in the decklist
- Only mainboard detected (no sideboard)
- Partial card names

**Solutions:**

1. **Check image quality:**
   ```bash
   # Minimum requirements
   - Resolution: 1200x800 pixels or higher
   - Format: PNG or JPEG (not WebP from Discord)
   - File size: Under 25MB
   ```

2. **Verify screenshot completeness:**
   - Ensure entire deck is visible (60 mainboard + 15 sideboard)
   - No UI elements covering card names
   - Deck view is in list mode, not visual mode

3. **Enable Never Give Up Mode™:**
   ```javascript
   // This should be automatic, but verify in logs
   // Look for: "Activating Never Give Up Mode"
   ```

4. **For MTGO screenshots:**
   - The MTGO Land Fix should activate automatically
   - Check logs for: "Applying MTGO land count correction"

### Problem: Card names are incorrect

**Symptoms:**
- Special characters missing (é, û, etc.)
- Split cards not recognized
- Double-faced cards issues

**Solutions:**

1. **Update Scryfall cache:**
   ```bash
   # Clear Redis cache if using
   redis-cli FLUSHDB
   
   # Or restart the server to refresh in-memory cache
   npm run dev
   ```

2. **Check fuzzy matching threshold:**
   ```javascript
   // In server/src/config/constants.ts
   FUZZY_MATCH_THRESHOLD: 0.8  // Lower for more lenient matching
   ```

3. **Verify card exists in Scryfall:**
   ```bash
   curl "https://api.scryfall.com/cards/search?q=name:cardname"
   ```

### Problem: Super-resolution not activating

**Symptoms:**
- Blurry text in small images
- OCR accuracy drops on low-res images

**Solutions:**

1. **Check image dimensions:**
   ```javascript
   // Images < 1200px width should trigger super-resolution
   // Check logs for: "Applying 4x super-resolution"
   ```

2. **Verify Python dependencies:**
   ```bash
   pip install opencv-python-headless numpy
   python -c "import cv2; print(cv2.__version__)"
   ```

---

## Discord Bot Problems

### Problem: Bot not responding to commands

**Symptoms:**
- `/deck-scan` command not appearing
- Bot appears offline
- No response to interactions

**Solutions:**

1. **Check bot token:**
   ```bash
   # In discord-bot/.env
   DISCORD_TOKEN=your_token_here
   
   # Verify token is valid (no spaces, correct format)
   ```

2. **Verify bot permissions:**
   - Required permissions: Send Messages, Embed Links, Attach Files, Use Slash Commands
   - OAuth2 scope: bot, applications.commands

3. **Check Python version:**
   ```bash
   python --version  # Should be 3.8 or higher
   pip install -U discord.py
   ```

4. **Review bot logs:**
   ```bash
   cd discord-bot
   python bot.py  # Run in terminal to see errors
   ```

### Problem: Clipboard feature not working

**Symptoms:**
- "Copy to clipboard" button disabled
- Clipboard copy fails silently

**Solutions:**

1. **Install clipboard dependencies:**
   ```bash
   # Windows
   pip install pywin32
   
   # macOS
   pip install pyobjc-framework-Cocoa
   
   # Linux
   sudo apt-get install xclip  # or xsel
   pip install pyperclip
   ```

2. **Test clipboard service:**
   ```bash
   cd discord-bot
   python demo_clipboard.py
   ```

### Problem: EasyOCR initialization fails

**Symptoms:**
- "Failed to initialize EasyOCR" error
- Memory errors during startup

**Solutions:**

1. **Check system requirements:**
   ```bash
   # Minimum 4GB RAM recommended
   # 2GB+ free disk space for models
   
   # First run downloads models (~1GB)
   python -c "import easyocr; reader = easyocr.Reader(['en'])"
   ```

2. **Clear EasyOCR cache:**
   ```bash
   # Linux/macOS
   rm -rf ~/.EasyOCR/
   
   # Windows
   rmdir /s %USERPROFILE%\.EasyOCR
   ```

---

## Web Application Errors

### Problem: Blank page or React errors

**Symptoms:**
- White screen on load
- Console errors about modules
- "Cannot GET /" error

**Solutions:**

1. **Rebuild the application:**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   npm run dev
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be v18 or higher
   npm --version   # Should be v9 or higher
   ```

3. **Verify proxy configuration:**
   ```javascript
   // In client/vite.config.ts
   proxy: {
     '/api': {
       target: 'http://localhost:3001',
       changeOrigin: true
     }
   }
   ```

### Problem: Upload fails immediately

**Symptoms:**
- "Upload failed" error
- Network error in console
- CORS errors

**Solutions:**

1. **Check file size:**
   ```javascript
   // Maximum file size: 25MB
   // Check in server/src/middleware/upload.ts
   limits: { fileSize: 25 * 1024 * 1024 }
   ```

2. **Verify CORS settings:**
   ```javascript
   // In server/src/index.ts
   app.use(cors({
     origin: process.env.CLIENT_URL || 'http://localhost:5173',
     credentials: true
   }));
   ```

3. **Check backend is running:**
   ```bash
   # Should see both processes
   lsof -i :5173  # Frontend
   lsof -i :3001  # Backend
   ```

---

## API and Backend Issues

### Problem: OpenAI API errors

**Symptoms:**
- "Invalid API key" error
- Rate limit errors
- Timeout errors

**Solutions:**

1. **Verify API key:**
   ```bash
   # In server/.env
   OPENAI_API_KEY=sk-...
   
   # Test the key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

2. **Check rate limits:**
   ```javascript
   // Implement exponential backoff
   // Default timeout: 30 seconds
   // Max retries: 3
   ```

3. **Monitor usage:**
   - Check OpenAI dashboard for usage limits
   - Consider upgrading tier if hitting limits

### Problem: Scryfall API timeout

**Symptoms:**
- Card validation takes too long
- "Scryfall API error" messages

**Solutions:**

1. **Respect rate limits:**
   ```javascript
   // Maximum 10 requests per second
   // Automatic 100ms delay between requests
   ```

2. **Enable caching:**
   ```bash
   # Use Redis for persistent cache
   docker run -d -p 6379:6379 redis
   
   # In .env
   REDIS_URL=redis://localhost:6379
   ```

---

## Installation Problems

### Problem: npm install fails

**Symptoms:**
- Dependency conflicts
- Permission errors
- Network timeouts

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Use correct Node version:**
   ```bash
   # Install nvm (Node Version Manager)
   nvm install 18
   nvm use 18
   ```

3. **Fix permissions (Linux/macOS):**
   ```bash
   sudo npm install -g npm@latest
   # Or use npx instead of global installs
   ```

### Problem: Docker build fails

**Symptoms:**
- Image build errors
- Container won't start
- Port conflicts

**Solutions:**

1. **Check Docker resources:**
   ```bash
   # Minimum 4GB RAM allocated to Docker
   docker system df  # Check disk space
   docker system prune  # Clean up
   ```

2. **Fix port conflicts:**
   ```bash
   # Find what's using the ports
   lsof -i :5173
   lsof -i :3001
   
   # Or use different ports in docker-compose.yml
   ```

---

## Performance Issues

### Problem: Slow OCR processing

**Symptoms:**
- Takes > 10 seconds per image
- Timeouts on large images
- High CPU/memory usage

**Solutions:**

1. **Enable performance optimizations:**
   ```javascript
   // In server/src/config/constants.ts
   ENABLE_PARALLEL_PROCESSING: true,
   WORKER_THREADS: 4,  // Adjust based on CPU cores
   ```

2. **Optimize image before upload:**
   ```bash
   # Resize large images
   convert input.png -resize 2000x2000> output.png
   
   # Convert to JPEG for smaller size
   convert input.png -quality 90 output.jpg
   ```

3. **Use caching effectively:**
   ```javascript
   // Cache hit rate should be > 90%
   // Check logs for cache statistics
   ```

### Problem: High memory usage

**Symptoms:**
- Server crashes with OOM
- Slow response times
- Memory warnings in logs

**Solutions:**

1. **Increase Node memory limit:**
   ```bash
   # In package.json scripts
   "start": "node --max-old-space-size=4096 dist/index.js"
   ```

2. **Enable garbage collection:**
   ```javascript
   // Force periodic cleanup
   if (global.gc) {
     setInterval(() => global.gc(), 60000);
   }
   ```

---

## Export Format Problems

### Problem: MTGA import fails

**Symptoms:**
- Arena doesn't recognize the deck
- Card names not matching
- Formatting errors

**Solutions:**

1. **Verify format:**
   ```
   # Correct MTGA format
   4 Lightning Bolt
   2 Island
   
   Sideboard
   3 Negate
   ```

2. **Check card legality:**
   - Ensure cards exist in Arena
   - Use exact Arena card names

### Problem: Clipboard copy not working

**Symptoms:**
- "Copied!" message but clipboard empty
- Browser security warnings

**Solutions:**

1. **Use HTTPS in production:**
   ```javascript
   // Clipboard API requires secure context
   // localhost is exempt, but production needs HTTPS
   ```

2. **Grant browser permissions:**
   - Allow clipboard access when prompted
   - Check browser settings for clipboard permissions

---

## Environment Configuration

### Problem: Environment variables not loading

**Symptoms:**
- "Missing required environment variable" errors
- Features not working (auth, APIs, etc.)

**Solutions:**

1. **Check .env file location:**
   ```bash
   # Server .env
   /server/.env
   
   # Discord bot .env
   /discord-bot/.env
   
   # Not in git (check .gitignore)
   ```

2. **Validate all required variables:**
   ```bash
   # Required for web app
   OPENAI_API_KEY=sk-...
   NODE_ENV=development|production
   PORT=3001
   
   # Required for Discord bot
   DISCORD_TOKEN=...
   
   # Optional but recommended
   REDIS_URL=redis://localhost:6379
   SENTRY_DSN=...
   ```

3. **Use validation script:**
   ```bash
   npm run validate:env
   ```

---

## Getting Help

If these solutions don't resolve your issue:

1. **Check existing issues:** GitHub Issues page
2. **Gather information:**
   - Error messages (full stack trace)
   - Environment (OS, Node version, browser)
   - Steps to reproduce
   - Screenshot of the problem
3. **Create detailed issue:** Include all information above
4. **Community support:** Discord server #support channel

---

## Quick Diagnostic Commands

```bash
# System check
npm run diagnose

# Test OCR pipeline
npm run test:ocr sample.png

# Validate installation
npm run validate:install

# Check all services
npm run health-check

# Generate debug report
npm run debug:report > debug.log
```

---

*Last Updated: 2025-08-11*