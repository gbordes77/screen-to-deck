# Frequently Asked Questions (FAQ)

## General Questions

### What is MTG Screen-to-Deck?

MTG Screen-to-Deck is an AI-powered tool that converts Magic: The Gathering screenshots into importable decklists. It uses advanced OCR technology to achieve 100% accuracy on MTGA and MTGO screenshots, automatically detecting all 60 mainboard and 15 sideboard cards.

### Which platforms are supported?

**Input Sources:**
- Magic: The Gathering Arena (MTGA) - Full support
- Magic: The Gathering Online (MTGO) - Full support with land count fix
- Other platforms - Best effort (may require manual corrections)

**Export Formats:**
- MTGA (direct import)
- Moxfield
- Archidekt  
- TappedOut
- Plain text
- JSON

### Is it free to use?

Yes! The basic web application and Discord bot are completely free. We may introduce premium features in the future, but core OCR functionality will always remain free.

### How accurate is the OCR?

We guarantee 100% accuracy on standard MTGA and MTGO screenshots that meet our quality requirements:
- Complete deck visible (60 mainboard + 15 sideboard)
- Minimum 1200x800 resolution
- Clear, unobstructed text
- List view (not visual/card view)

---

## Usage Questions

### How do I use the web application?

1. Visit the website
2. Click "Upload Screenshot" or drag & drop your image
3. Wait 3-5 seconds for processing
4. Your deck is automatically copied to clipboard
5. Click export buttons for other formats

### How do I use the Discord bot?

1. Invite the bot to your server
2. Use `/deck-scan` command
3. Upload your screenshot
4. Bot responds with the decklist
5. Click "Copy to Clipboard" button

### Why isn't my screenshot working?

Common issues and solutions:

**Problem: Partial deck detection**
- Ensure the entire deck is visible in the screenshot
- Use list view, not card/visual view
- Check that no UI elements cover card names

**Problem: Blurry or low-quality image**
- Minimum resolution: 1200x800 pixels
- Use PNG or JPEG format
- Avoid heavily compressed images
- Take screenshots at 100% zoom

**Problem: Non-English cards**
- Currently only English cards are supported
- Multi-language support coming in Q4 2025

### Can I scan paper cards?

Not yet, but it's our #2 most requested feature! Paper card scanning is planned for Q3 2025 (v2.2.0). This will include:
- Camera capture on mobile devices
- Physical card detection
- Multi-angle capture
- Batch scanning

### Can I scan handwritten decklists?

This feature is planned for Q4 2025 (v3.0.0). It will support:
- Handwritten tournament sheets
- Printed decklists
- Mixed handwritten/printed lists

---

## Technical Questions

### What technology do you use for OCR?

**Web Application:**
- Primary: OpenAI Vision API (GPT-4 Vision)
- Preprocessing: Super-resolution for low-res images
- Validation: Scryfall API for card name verification

**Discord Bot:**
- Primary: EasyOCR with English model
- Fallback: OpenAI Vision API
- Post-processing: MTGO land count correction

### Why does MTGO sometimes show wrong land counts?

MTGO has a display bug where single lands show without the count (e.g., "Island" instead of "1 Island"). Our MTGO Land Fix automatically corrects this issue by:
1. Detecting MTGO screenshots
2. Adding "1" to lands without quantities
3. Validating the total equals 75 cards

### How does the "Never Give Up Mode™" work?

If initial OCR doesn't detect exactly 75 cards, the system:
1. Applies enhanced preprocessing
2. Tries different zone detection strategies
3. Uses multiple OCR passes with different parameters
4. Guarantees exactly 60 mainboard + 15 sideboard cards

### What is the smart caching system?

Our caching system:
- Stores validated card names for 30 minutes
- Uses fuzzy matching (Levenshtein, Jaro-Winkler, Phonetic)
- Achieves 95% cache hit rate on common cards
- Reduces Scryfall API calls significantly
- Speeds up repeated scans

### How fast is the processing?

**Average processing times:**
- Standard screenshot: 3.2 seconds
- With super-resolution: 4.5 seconds
- With Never Give Up Mode: 5-8 seconds
- Cached cards: < 1 second

**Performance factors:**
- Image resolution (higher = slower initial processing)
- Number of unique cards (more unique = more API calls)
- Cache hit rate (cached cards are instant)
- Server load (usually minimal impact)

---

## Privacy & Security Questions

### Do you store my screenshots?

**Temporary storage only:**
- Images are processed in memory
- Temporary files deleted after 1 hour
- No permanent storage of images
- No image metadata retained

### Do you track my decklists?

**We DO NOT:**
- Store your decklists permanently
- Track your personal information
- Share data with third parties
- Use analytics or tracking cookies

**We DO:**
- Cache card names temporarily (30 minutes)
- Log errors for debugging (no personal data)
- Count total API usage (anonymous)

### Is my data secure?

Yes! Security measures include:
- HTTPS encryption for all connections
- API keys stored securely
- No personal data collection
- Regular security updates
- Input sanitization and validation

See [SECURITY.md](./SECURITY.md) for full details.

### Can I self-host the application?

Absolutely! The project is open-source and can be self-hosted:

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the application
npm run dev
```

See [Self-Hosting Guide](./04_DEPLOYMENT/SELF_HOSTING.md) for detailed instructions.

---

## Troubleshooting Questions

### Why is the Discord bot not responding?

1. Check bot has required permissions (Send Messages, Use Slash Commands)
2. Verify bot is online (green status)
3. Try `/deck-scan` command (not `!deck-scan`)
4. Check #support channel for outages

### Why does the clipboard copy not work?

**Browser requirements:**
- HTTPS connection (or localhost)
- Modern browser (Chrome, Firefox, Safari, Edge)
- Clipboard permissions granted

**Discord bot:**
- Desktop Discord app (not browser)
- Clipboard access permissions
- Python clipboard dependencies installed

### Why am I getting an API error?

**Common causes:**
- OpenAI API key invalid or expired
- Rate limits exceeded (wait a few minutes)
- Network connectivity issues
- Server maintenance (check status page)

### The website is showing a blank page

1. Clear browser cache and cookies
2. Disable browser extensions (especially ad blockers)
3. Try a different browser
4. Check console for errors (F12 → Console)

---

## Feature Requests

### Will you support other TCGs?

Currently focused on Magic: The Gathering, but considering:
- Pokémon TCG (2026)
- Yu-Gi-Oh! (2026)
- Flesh and Blood (evaluating interest)

### Can you add [specific feature]?

Check our [ROADMAP.md](./ROADMAP.md) for planned features. Vote for features or suggest new ones:
- GitHub Issues for feature requests
- Discord #suggestions channel
- Email: features@[project-domain].com

### Will there be a mobile app?

Yes! Native mobile apps are planned for Q3 2025:
- iOS app with camera scanning
- Android app with offline mode
- React Native for code sharing
- Direct integration with card cameras

### Can you add my favorite export format?

We're always adding new export formats! Current priorities:
1. Cockatrice (Q3 2025)
2. XMage (Q3 2025)
3. Forge (Q4 2025)
4. Custom formats (submit a request)

---

## Support & Community

### How can I get help?

**For technical issues:**
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Search existing GitHub issues
3. Create a new issue with details
4. Join Discord #support channel

**For general questions:**
- Discord #general channel
- Twitter @[project-handle]
- Email: support@[project-domain].com

### How can I contribute?

We welcome contributions! See [CONTRIBUTING.md](./05_DEVELOPMENT/CONTRIBUTING.md) for:
- Code contributions
- Bug reports
- Feature requests
- Translations
- Documentation improvements

### Where can I report bugs?

**For bugs:**
1. Check if already reported (GitHub Issues)
2. Create detailed bug report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot/error messages
   - System information

**For security issues:**
- Email: security@[project-domain].com
- Do NOT post publicly
- See [SECURITY.md](./SECURITY.md)

### Is there a Discord server?

Yes! Join our community Discord for:
- Real-time support
- Feature discussions
- Beta testing
- Community decklists
- MTG discussions

[Join Discord Server](https://discord.gg/...)

---

## Legal Questions

### Is this affiliated with Wizards of the Coast?

No, this is an independent project. Magic: The Gathering, Magic, and all card names are © Wizards of the Coast LLC. We are not affiliated with, endorsed by, or sponsored by Wizards of the Coast.

### What license is the code under?

The project is licensed under the MIT License. See [LICENSE.md](./LICENSE.md) for details. You are free to:
- Use the code commercially
- Modify and distribute
- Use privately
- Must include copyright notice

### Can I use this for commercial purposes?

The code is MIT licensed, so yes. However:
- Respect Wizards of the Coast trademarks
- Follow Scryfall API terms
- Obtain your own API keys
- Comply with platform ToS

---

## Miscellaneous

### What does the version number mean?

We use Semantic Versioning (SemVer):
- **2.1.0** = Major.Minor.Patch
- **Major**: Breaking changes
- **Minor**: New features (backwards compatible)
- **Patch**: Bug fixes

### How often do you release updates?

- **Major releases**: Quarterly
- **Minor releases**: Monthly  
- **Bug fixes**: As needed (critical within 48 hours)
- **Beta channel**: Weekly

### Why is it called "Screen-to-Deck"?

The name reflects our core functionality:
- **Screen**: Screenshot input
- **to**: Conversion process
- **Deck**: Playable decklist output

Simple, descriptive, and memorable!

### Can I sponsor or donate to the project?

Currently, we're not accepting donations. Ways to support:
- Star the GitHub repository
- Share with friends
- Contribute code or documentation
- Report bugs and suggest features
- Join the Discord community

---

*Can't find your answer? Ask in our Discord or create a GitHub issue!*

*Last Updated: 2025-08-11*