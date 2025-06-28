# 🚀 Quick Start Guide - MTG Deck Scanner

Get up and running with both the **Web Application** and **Discord Bot** in minutes!

## 🎯 Choose Your Platform

### 🌐 Option 1: Web Application (Recommended for beginners)
Perfect for personal use and testing

### 🤖 Option 2: Discord Bot
Great for communities and Discord servers

### 🐳 Option 3: Full Docker Setup
Production-ready with all services

---

## 🌐 Web Application Setup

### Prerequisites
- ✅ Node.js 18+
- ✅ OpenAI API key

### 1-Minute Setup
```bash
# 1. Clone & install
git clone https://github.com/your-username/mtg-deck-converter.git
cd mtg-deck-converter
npm run setup

# 2. Configure API key
cp server/env.example server/.env
# Edit server/.env and add your OPENAI_API_KEY

# 3. Start the app
npm run dev
```

🎉 **Done!** Open http://localhost:5173

---

## 🤖 Discord Bot Setup

### Prerequisites
- ✅ Python 3.11+
- ✅ Tesseract OCR
- ✅ Discord Bot Token

### Install Tesseract
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS
brew install tesseract

# Windows: Download from GitHub
```

### 1-Minute Setup
```bash
# 1. Navigate to bot directory
cd discord-bot

# 2. Run the magic script (does everything!)
chmod +x start-bot.sh
./start-bot.sh
```

The script will:
- ✅ Check Python version
- ✅ Verify Tesseract installation
- ✅ Create virtual environment
- ✅ Install dependencies
- ✅ Prompt for Discord token
- ✅ Start the bot

🎉 **Done!** Your bot is online!

---

## 🐳 Docker Setup (All-in-One)

### Prerequisites
- ✅ Docker & Docker Compose

### 1-Minute Setup
```bash
# 1. Clone repository
git clone https://github.com/your-username/mtg-deck-converter.git
cd mtg-deck-converter

# 2. Configure environment
cp docker-compose.env.example .env
# Edit .env with your API keys

# 3. Start everything
docker-compose up -d
```

Services will be available at:
- 🌐 Web App: http://localhost:5173
- 🔗 API: http://localhost:3001
- 🤖 Discord Bot: Connects automatically

---

## 🎮 Usage Guide

### 🌐 Web Application
1. **Upload** a deck screenshot
2. **Wait** for AI processing (10-30 seconds)
3. **Review** detected cards
4. **Export** in your preferred format
5. **Import** to MTG Arena, Moxfield, etc.

### 🤖 Discord Bot

#### Automatic Mode
1. **Upload** deck image to Discord
2. **Click** the 📷 reaction the bot adds
3. **Get** instant results with file download

#### Manual Commands
```
/scan                    # Scan latest image
/scan format:moxfield    # Export to Moxfield
/help                    # Show help
```

---

## 🔧 Configuration

### Environment Variables

**Web App** (`server/.env`):
```env
OPENAI_API_KEY=your_key_here
PORT=3001
```

**Discord Bot**:
```bash
export DISCORD_BOT_TOKEN="your_token_here"
```

**Docker** (`.env`):
```env
OPENAI_API_KEY=your_openai_key
DISCORD_BOT_TOKEN=your_discord_token
```

---

## 🆘 Troubleshooting

### ❌ Common Issues

**Web App won't start:**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clean install
rm -rf node_modules server/node_modules client/node_modules
npm run setup
```

**Discord Bot errors:**
```bash
# Check Python version
python3 --version  # Should be 3.11+

# Check Tesseract
tesseract --version

# Re-run setup script
cd discord-bot && ./start-bot.sh
```

**OCR not working:**
- ✅ Use high contrast images
- ✅ Ensure good lighting
- ✅ Try different image formats
- ✅ Check Tesseract installation

### 🔍 Debug Mode

**Web App:**
```bash
DEBUG=* npm run dev
```

**Discord Bot:**
```bash
LOG_LEVEL=DEBUG python3 bot.py
```

---

## 🎯 Supported Formats

### 📥 Input
- PNG, JPG, JPEG, GIF, WebP
- Screenshots from MTG Arena, MTGO, deck builders
- Physical deck photos

### 📤 Output
- **MTG Arena** - Direct import
- **Moxfield** - URL-ready format
- **Archidekt** - Compatible format  
- **TappedOut** - Classic format
- **Plain Text** - Universal format

---

## 📚 Examples

### Input Image Text:
```
4x Lightning Bolt
2 Counterspell  
1x Black Lotus
Ancestral Recall (1)
```

### MTG Arena Output:
```
Deck
4 Lightning Bolt
2 Counterspell
1 Black Lotus
1 Ancestral Recall
```

---

## ⚡ Performance Tips

### For Best OCR Results:
1. **High contrast** images
2. **Clear, readable** text
3. **Standard fonts** work best
4. **Good lighting** essential
5. **Avoid** blurry or distorted images

### Speed Optimization:
- Use **local Tesseract** (Discord bot) for faster processing
- **Cache** card validation results
- **Batch process** multiple images
- Use **Docker** for consistent performance

---

## 🚀 Next Steps

### Explore Advanced Features:
- **Deck statistics** and analysis
- **Format legality** checking  
- **Card suggestions** and recommendations
- **Batch processing** multiple decks

### Contribute:
- Report bugs on GitHub
- Suggest new features
- Submit pull requests
- Share your deck scanning results!

---

## 🎉 Success!

You're now ready to scan MTG decks like a pro! 

**Questions?** Check the full README.md or open an issue on GitHub.

**Happy deck building, Planeswalkers!** 🃏✨ 