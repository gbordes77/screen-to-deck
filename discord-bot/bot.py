#!/usr/bin/env python3
"""
🃏 Enhanced MTG Deck Scanner Discord Bot - Phase 1
Integrates with enhanced Scryfall service for intelligent deck scanning
Now with automatic correction, format detection, and comprehensive analysis
"""

import os
import asyncio
import logging
import tempfile
from io import BytesIO
from typing import Optional, List, Dict, Any
import json

import discord
from discord.ext import commands
import aiohttp
from PIL import Image
import requests
from dotenv import load_dotenv

from ocr_parser import MTGOCRParser, ParseResult, ParsedCard
from scryfall_service import ScryfallService, DeckAnalysis

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MTGScannerBot(commands.Bot):
    """Enhanced Discord Bot class for intelligent MTG deck scanning"""
    
    def __init__(self):
        # Configure intents
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.guild_messages = True
        intents.reactions = True
        
        super().__init__(
            command_prefix='!',
            intents=intents,
            description='🃏 Enhanced MTG Deck Scanner - AI-powered deck analysis with Scryfall!',
            help_command=commands.DefaultHelpCommand(no_category='Commands')
        )
        
        # Configuration
        self.api_base_url = os.getenv('API_BASE_URL', 'http://localhost:3001/api')
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.supported_formats = ['png', 'jpg', 'jpeg', 'gif', 'webp']
        self.camera_emoji = '📷'
        
        # Initialize services
        self.scryfall_service = None
        self.ocr_parser = None
        
        # Processing tracking
        self.processing_jobs: Dict[str, Dict[str, Any]] = {}
        
        # Statistics
        self.stats = {
            'scans_processed': 0,
            'cards_identified': 0,
            'corrections_applied': 0,
            'formats_detected': {}
        }
    
    async def setup_hook(self):
        """Initialize enhanced bot services"""
        logger.info("🚀 Initializing Enhanced MTG Scanner Bot...")
        
        # Initialize enhanced Scryfall service
        self.scryfall_service = ScryfallService()
        await self.scryfall_service.__aenter__()
        
        # Initialize enhanced OCR parser
        self.ocr_parser = MTGOCRParser(self.scryfall_service)
        
        logger.info("✅ Enhanced bot services initialized successfully!")
        logger.info("🔧 Features: Auto-correction, Format detection, Intelligent validation")
    
    async def on_ready(self):
        """Called when bot is ready"""
        logger.info(f'🤖 {self.user} is now online!')
        logger.info(f'📊 Connected to {len(self.guilds)} guilds')
        
        # Set enhanced bot activity
        activity = discord.Activity(
            type=discord.ActivityType.watching,
            name="for MTG decks 🧠 AI-powered scanning!"
        )
        await self.change_presence(activity=activity)
    
    async def on_message(self, message):
        """Handle incoming messages with enhanced detection"""
        # Ignore bot messages
        if message.author.bot:
            return
        
        # Process attachments for images
        if message.attachments:
            await self.handle_image_attachments(message)
        
        # Process commands
        await self.process_commands(message)
    
    async def on_reaction_add(self, reaction, user):
        """Handle reaction additions with enhanced processing"""
        # Ignore bot reactions
        if user.bot:
            return
        
        # Check for camera emoji on messages with images
        if str(reaction.emoji) == self.camera_emoji:
            message = reaction.message
            if message.attachments:
                # Process the image with enhanced analysis
                await self.scan_message_images(message, user, auto_scan=True)
    
    async def handle_image_attachments(self, message):
        """Add camera emoji to messages with image attachments"""
        has_image = any(
            attachment.filename.lower().split('.')[-1] in self.supported_formats
            for attachment in message.attachments
        )
        
        if has_image:
            await message.add_reaction(self.camera_emoji)
    
    async def scan_message_images(self, message, user, auto_scan=False, 
                                 export_format='enhanced', include_analysis=True,
                                 language='en'):
        """Enhanced image scanning with comprehensive analysis"""
        if not message.attachments:
            if not auto_scan:
                await message.reply("❌ No images found to scan!")
            return
        
        # Find image attachments
        image_attachments = [
            att for att in message.attachments
            if att.filename.lower().split('.')[-1] in self.supported_formats
        ]
        
        if not image_attachments:
            if not auto_scan:
                await message.reply("❌ No supported image formats found!")
            return
        
        # Process first image
        attachment = image_attachments[0]
        
        if attachment.size > self.max_file_size:
            await message.reply(f"❌ Image too large! Max size: {self.max_file_size // (1024*1024)}MB")
            return
        
        # Create enhanced processing message
        processing_embed = discord.Embed(
            title="🔍 **AI-Powered Deck Analysis**",
            description=(
                f"📸 **Image:** `{attachment.filename}`\n"
                f"👤 **Requested by:** {user.mention}\n"
                f"🧠 **AI Features:** Scryfall validation, format detection, auto-correction\n"
                f"⏳ **Status:** Processing..."
            ),
            color=discord.Color.blue()
        )
        processing_embed.set_footer(text="Enhanced MTG Scanner v2.0")
        
        processing_msg = await message.reply(embed=processing_embed)
        
        try:
            # Download and process image
            async with aiohttp.ClientSession() as session:
                async with session.get(attachment.url) as resp:
                    if resp.status != 200:
                        raise Exception(f"Failed to download image: {resp.status}")
                    
                    image_data = await resp.read()
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=f'.{attachment.filename.split(".")[-1]}', delete=False) as temp_file:
                temp_file.write(image_data)
                temp_file_path = temp_file.name
            
            try:
                # Update status - OCR phase
                processing_embed.description = processing_embed.description.replace(
                    "⏳ **Status:** Processing...",
                    "🔤 **Status:** Extracting text with advanced OCR..."
                )
                await processing_msg.edit(embed=processing_embed)
                
                # Process with enhanced OCR parser
                parse_result: ParseResult = await self.ocr_parser.parse_deck_image(
                    temp_file_path, 
                    language=language
                )
                
                if not parse_result.cards:
                    # No cards detected
                    error_embed = discord.Embed(
                        title="❌ **No Magic Cards Detected**",
                        description=(
                            "The AI couldn't identify any Magic cards in this image.\n\n"
                            f"**Processing Notes:**\n"
                            f"```{chr(10).join(parse_result.processing_notes)}```"
                        ),
                        color=discord.Color.red()
                    )
                    
                    if parse_result.errors:
                        error_embed.add_field(
                            name="🐛 **Errors**",
                            value=f"```{chr(10).join(parse_result.errors)}```",
                            inline=False
                        )
                    
                    await processing_msg.edit(embed=error_embed)
                    return
                
                # Update status - validation phase
                processing_embed.description = processing_embed.description.replace(
                    "🔤 **Status:** Extracting text with advanced OCR...",
                    "✅ **Status:** Validating cards with Scryfall API..."
                )
                await processing_msg.edit(embed=processing_embed)
                
                # Create enhanced result
                await self.send_enhanced_scan_results(
                    message,
                    processing_msg,
                    parse_result,
                    export_format,
                    include_analysis,
                    user
                )
                
                # Update statistics
                self.stats['scans_processed'] += 1
                self.stats['cards_identified'] += len([c for c in parse_result.cards if c.is_validated])
                self.stats['corrections_applied'] += len([c for c in parse_result.cards if c.correction_applied])
                
                if parse_result.format_analysis:
                    format_name = parse_result.format_analysis.get('format', 'unknown')
                    self.stats['formats_detected'][format_name] = self.stats['formats_detected'].get(format_name, 0) + 1
                
            finally:
                # Clean up temp file
                try:
                    os.remove(temp_file_path)
                except:
                    pass
                
        except Exception as e:
            error_embed = discord.Embed(
                title="❌ **Processing Error**",
                description=f"An error occurred during processing: ```{str(e)}```",
                color=discord.Color.red()
            )
            error_embed.set_footer(text="Please try again or contact support")
            await processing_msg.edit(embed=error_embed)
            logger.error(f"Error processing image: {e}")
    
    async def send_enhanced_scan_results(self, original_message, processing_msg, 
                                       parse_result: ParseResult, export_format, 
                                       include_analysis, user):
        """Send enhanced scan results with comprehensive information"""
        
        # Prepare data
        validated_cards = [c for c in parse_result.cards if c.is_validated]
        unvalidated_cards = [c for c in parse_result.cards if not c.is_validated]
        corrected_cards = [c for c in parse_result.cards if c.correction_applied]
        
        total_cards = sum(c.quantity for c in validated_cards)
        confidence = parse_result.confidence_score
        
        # Create main result embed
        result_embed = discord.Embed(
            title="✅ **Deck Analysis Complete!**",
            color=discord.Color.green() if confidence > 0.7 else discord.Color.gold()
        )
        
        # Main statistics
        stats_text = [
            f"**📊 Cards Identified:** {len(validated_cards)}/{len(parse_result.cards)}",
            f"**🔢 Total Quantity:** {total_cards}",
            f"**🎯 Confidence:** {confidence:.1%}",
        ]
        
        if corrected_cards:
            stats_text.append(f"**🔧 Auto-Corrections:** {len(corrected_cards)}")
        
        result_embed.add_field(
            name="📈 **Scan Results**",
            value="\n".join(stats_text),
            inline=True
        )
        
        # Format analysis
        if parse_result.format_analysis and include_analysis:
            format_info = parse_result.format_analysis
            format_text = [
                f"**🎲 Format:** {format_info.get('format', 'Unknown').title()}",
                f"**💰 Est. Price:** ${format_info.get('price_estimate', 0):.2f}",
            ]
            
            if format_info.get('color_identity'):
                colors = format_info['color_identity']
                color_emojis = {'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢'}
                color_str = ''.join(color_emojis.get(c, c) for c in colors)
                format_text.append(f"**🎨 Colors:** {color_str}")
            
            if format_info.get('estimated_tier'):
                format_text.append(f"**⚔️ Tier:** {format_info['estimated_tier']}")
            
            result_embed.add_field(
                name="🔍 **Format Analysis**",
                value="\n".join(format_text),
                inline=True
            )
        
        # Commander detection
        if parse_result.format_analysis and parse_result.format_analysis.get('commander'):
            commander = parse_result.format_analysis['commander']
            result_embed.add_field(
                name="👑 **Commander**",
                value=f"**{commander['name']}**",
                inline=False
            )
        
        # Show sample cards
        if validated_cards:
            sample_size = min(8, len(validated_cards))
            sample_cards = validated_cards[:sample_size]
            
            cards_text = []
            for card in sample_cards:
                card_line = f"`{card.quantity}x` **{card.name}**"
                if card.correction_applied:
                    card_line += " 🔧"
                cards_text.append(card_line)
            
            if len(validated_cards) > sample_size:
                cards_text.append(f"*... and {len(validated_cards) - sample_size} more*")
            
            result_embed.add_field(
                name="📚 **Identified Cards**",
                value="\n".join(cards_text),
                inline=False
            )
        
        # Corrections applied
        if corrected_cards:
            corrections_text = []
            for card in corrected_cards[:3]:  # Show max 3 corrections
                corrections_text.append(f"🔧 `{card.original_text}` → **{card.name}**")
            
            if len(corrected_cards) > 3:
                corrections_text.append(f"*... and {len(corrected_cards) - 3} more corrections*")
            
            result_embed.add_field(
                name="🛠️ **Auto-Corrections Applied**",
                value="\n".join(corrections_text),
                inline=False
            )
        
        # Unvalidated cards (suggestions)
        if unvalidated_cards:
            unvalidated_text = []
            for card in unvalidated_cards[:3]:  # Show max 3 failed cards
                suggestion_text = f"❓ `{card.original_text}`"
                if card.suggestions:
                    suggestion_text += f" → *{card.suggestions[0]}?*"
                unvalidated_text.append(suggestion_text)
            
            if len(unvalidated_cards) > 3:
                unvalidated_text.append(f"*... and {len(unvalidated_cards) - 3} more*")
            
            result_embed.add_field(
                name="⚠️ **Needs Review**",
                value="\n".join(unvalidated_text),
                inline=False
            )
        
        # Format legality issues
        if (parse_result.format_analysis and 
            parse_result.format_analysis.get('legality_issues')):
            issues = parse_result.format_analysis['legality_issues'][:3]
            result_embed.add_field(
                name="⚖️ **Format Legality**",
                value="\n".join(issues),
                inline=False
            )
        
        # Processing details
        if parse_result.processing_notes:
            processing_text = "\n".join(parse_result.processing_notes[-3:])  # Last 3 notes
            result_embed.add_field(
                name="🔍 **Processing Details**",
                value=f"```{processing_text}```",
                inline=False
            )
        
        result_embed.set_footer(
            text=f"Scanned for {user.display_name} • Enhanced MTG Scanner v2.0",
            icon_url=user.avatar.url if user.avatar else None
        )
        
        # Create action buttons
        view = EnhancedDeckView(parse_result, self.scryfall_service, user.id)
        
        # Generate export file
        export_content = await self.generate_enhanced_export(parse_result, export_format)
        
        file = None
        if export_content:
            file = discord.File(
                BytesIO(export_content.encode('utf-8')),
                filename=f"deck_scan_{export_format}.txt"
            )
        
        # Send result
        await processing_msg.edit(embed=result_embed, view=view, attachments=[file] if file else [])
    
    async def generate_enhanced_export(self, parse_result: ParseResult, format_type: str) -> str:
        """Generate enhanced export content"""
        validated_cards = [c for c in parse_result.cards if c.is_validated]
        
        if format_type == 'mtga':
            # MTGA format
            lines = []
            
            # Commander if detected
            if (parse_result.format_analysis and 
                parse_result.format_analysis.get('commander')):
                commander = parse_result.format_analysis['commander']
                lines.append("Commander")
                lines.append(f"1 {commander['name']}")
                lines.append("")
            
            # Main deck
            lines.append("Deck")
            for card in validated_cards:
                lines.append(f"{card.quantity} {card.name}")
            
            return "\n".join(lines)
            
        elif format_type == 'moxfield':
            # Moxfield format
            lines = []
            for card in validated_cards:
                set_code = ""
                if card.scryfall_data and card.scryfall_data.get('set'):
                    set_code = f" ({card.scryfall_data['set'].upper()})"
                lines.append(f"{card.quantity}x {card.name}{set_code}")
            
            return "\n".join(lines)
            
        elif format_type == 'enhanced':
            # Enhanced format with metadata
            lines = [
                "# Enhanced MTG Deck Export",
                f"# Scanned with {parse_result.confidence_score:.1%} confidence",
                ""
            ]
            
            # Format info
            if parse_result.format_analysis:
                fa = parse_result.format_analysis
                lines.extend([
                    f"# Format: {fa.get('format', 'Unknown')}",
                    f"# Total Cards: {fa.get('total_cards', 0)}",
                    f"# Estimated Price: ${fa.get('price_estimate', 0):.2f}",
                    f"# Colors: {', '.join(fa.get('color_identity', []))}",
                    ""
                ])
            
            # Commander
            if (parse_result.format_analysis and 
                parse_result.format_analysis.get('commander')):
                commander = parse_result.format_analysis['commander']
                lines.extend([
                    "# Commander",
                    f"1x {commander['name']}",
                    ""
                ])
            
            # Main deck
            lines.append("# Main Deck")
            for card in validated_cards:
                correction_note = " # Auto-corrected" if card.correction_applied else ""
                lines.append(f"{card.quantity}x {card.name}{correction_note}")
            
            # Unvalidated cards
            unvalidated = [c for c in parse_result.cards if not c.is_validated]
            if unvalidated:
                lines.extend(["", "# Unvalidated Cards (Manual Review Needed)"])
                for card in unvalidated:
                    suggestion = f" # Suggestion: {card.suggestions[0]}" if card.suggestions else ""
                    lines.append(f"# {card.quantity}x {card.name}{suggestion}")
            
            return "\n".join(lines)
        
        else:
            # Plain text format
            lines = []
            for card in validated_cards:
                lines.append(f"{card.quantity}x {card.name}")
            return "\n".join(lines)

class EnhancedDeckView(discord.ui.View):
    """Enhanced view with advanced interaction buttons"""
    
    def __init__(self, parse_result: ParseResult, scryfall_service: ScryfallService, user_id: int):
        super().__init__(timeout=600)  # 10 minutes
        self.parse_result = parse_result
        self.scryfall_service = scryfall_service
        self.user_id = user_id
        
    @discord.ui.button(label="MTGA Export", style=discord.ButtonStyle.primary, emoji="🎮")
    async def export_mtga(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Only the original requester can use this.", ephemeral=True)
            return
            
        content = await self._generate_export('mtga')
        file = discord.File(BytesIO(content.encode('utf-8')), filename="deck_mtga.txt")
        await interaction.response.send_message(
            "🎮 **MTGA Format Export**\nReady to import into Magic Arena!",
            file=file,
            ephemeral=True
        )
    
    @discord.ui.button(label="Moxfield", style=discord.ButtonStyle.primary, emoji="📋")
    async def export_moxfield(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Only the original requester can use this.", ephemeral=True)
            return
            
        content = await self._generate_export('moxfield')
        file = discord.File(BytesIO(content.encode('utf-8')), filename="deck_moxfield.txt")
        await interaction.response.send_message(
            "📋 **Moxfield Format Export**\nReady to import into Moxfield!",
            file=file,
            ephemeral=True
        )
    
    @discord.ui.button(label="Statistics", style=discord.ButtonStyle.secondary, emoji="📊")
    async def show_stats(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Only the original requester can use this.", ephemeral=True)
            return
            
        embed = await self._create_stats_embed()
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @discord.ui.button(label="Analysis Report", style=discord.ButtonStyle.secondary, emoji="🔍")
    async def detailed_analysis(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Only the original requester can use this.", ephemeral=True)
            return
            
        content = await self._generate_analysis_report()
        file = discord.File(BytesIO(content.encode('utf-8')), filename="deck_analysis.txt")
        await interaction.response.send_message(
            "🔍 **Detailed Analysis Report**\nComprehensive deck breakdown with AI insights!",
            file=file,
            ephemeral=True
        )
    
    async def _generate_export(self, format_type: str) -> str:
        """Generate export content for different formats"""
        validated_cards = [c for c in self.parse_result.cards if c.is_validated]
        
        if format_type == 'mtga':
            lines = ["Deck"]
            for card in validated_cards:
                lines.append(f"{card.quantity} {card.name}")
            return "\n".join(lines)
        elif format_type == 'moxfield':
            lines = []
            for card in validated_cards:
                lines.append(f"{card.quantity}x {card.name}")
            return "\n".join(lines)
    
    async def _create_stats_embed(self) -> discord.Embed:
        """Create detailed statistics embed"""
        embed = discord.Embed(
            title="📊 **Detailed Deck Statistics**",
            color=discord.Color.blue()
        )
        
        validated_cards = [c for c in self.parse_result.cards if c.is_validated]
        
        # Basic stats
        total_cards = sum(c.quantity for c in validated_cards)
        avg_cmc = 0.0
        
        if validated_cards:
            cmc_sum = 0
            cmc_count = 0
            for card in validated_cards:
                if card.scryfall_data and 'cmc' in card.scryfall_data:
                    cmc_sum += card.scryfall_data['cmc'] * card.quantity
                    cmc_count += card.quantity
            
            if cmc_count > 0:
                avg_cmc = cmc_sum / cmc_count
        
        embed.add_field(
            name="📈 **Overview**",
            value=(
                f"**Total Cards:** {total_cards}\n"
                f"**Unique Cards:** {len(validated_cards)}\n"
                f"**Average CMC:** {avg_cmc:.2f}\n"
                f"**Scan Confidence:** {self.parse_result.confidence_score:.1%}"
            ),
            inline=True
        )
        
        # Color distribution
        color_count = {}
        for card in validated_cards:
            if card.scryfall_data and 'colors' in card.scryfall_data:
                for color in card.scryfall_data['colors']:
                    color_count[color] = color_count.get(color, 0) + card.quantity
        
        if color_count:
            color_emojis = {'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢'}
            color_text = "\n".join([
                f"{color_emojis.get(color, color)}: {count} cards"
                for color, count in sorted(color_count.items())
            ])
            embed.add_field(
                name="🎨 **Color Distribution**",
                value=color_text,
                inline=True
            )
        
        return embed
    
    async def _generate_analysis_report(self) -> str:
        """Generate comprehensive analysis report"""
        lines = [
            "# MTG Deck Analysis Report",
            "# Generated by Enhanced MTG Scanner v2.0",
            "",
            f"## Scan Results",
            f"- Confidence Score: {self.parse_result.confidence_score:.1%}",
            f"- Cards Processed: {len(self.parse_result.cards)}",
            f"- Cards Validated: {len([c for c in self.parse_result.cards if c.is_validated])}",
            f"- Auto-Corrections: {len([c for c in self.parse_result.cards if c.correction_applied])}",
            ""
        ]
        
        # Format analysis
        if self.parse_result.format_analysis:
            fa = self.parse_result.format_analysis
            lines.extend([
                "## Format Analysis",
                f"- Detected Format: {fa.get('format', 'Unknown')}",
                f"- Total Cards: {fa.get('total_cards', 0)}",
                f"- Color Identity: {', '.join(fa.get('color_identity', []))}",
                f"- Estimated Tier: {fa.get('estimated_tier', 'Unknown')}",
                f"- Price Estimate: ${fa.get('price_estimate', 0):.2f}",
                ""
            ])
        
        # Validated cards
        validated_cards = [c for c in self.parse_result.cards if c.is_validated]
        if validated_cards:
            lines.extend([
                "## Validated Cards",
                ""
            ])
            for card in validated_cards:
                correction_note = " (Auto-corrected)" if card.correction_applied else ""
                lines.append(f"{card.quantity}x {card.name}{correction_note}")
            lines.append("")
        
        # Processing notes
        if self.parse_result.processing_notes:
            lines.extend([
                "## Processing Details",
                ""
            ])
            for note in self.parse_result.processing_notes:
                lines.append(f"- {note}")
        
        return "\n".join(lines)

# Slash commands
@commands.slash_command(
    name="scan", 
    description="🧠 Enhanced AI-powered scan of the latest image for MTG cards"
)
async def enhanced_scan_command(
    ctx,
    format: discord.Option(
        str,
        description="Export format",
        choices=["enhanced", "mtga", "moxfield", "archidekt", "plain"],
        default="enhanced"
    ),
    analysis: discord.Option(
        bool,
        description="Include comprehensive deck analysis",
        default=True
    ),
    language: discord.Option(
        str,
        description="OCR language",
        choices=["en", "fr", "es", "de", "it", "pt"],
        default="en"
    )
):
    """Enhanced scan command with AI features"""
    await ctx.response.defer()
    
    # Find latest image in channel
    image_found = None
    async for message in ctx.channel.history(limit=20):
        if message.attachments:
            for attachment in message.attachments:
                if any(attachment.filename.lower().endswith(ext) 
                       for ext in ['png', 'jpg', 'jpeg', 'gif', 'webp']):
                    image_found = attachment
                    break
        if image_found:
            break
    
    if not image_found:
        await ctx.followup.send(
            "❌ No image found in recent messages. Send an image first, then use `/scan`."
        )
        return
    
    # Create a temporary message with the attachment for processing
    temp_msg = await ctx.channel.fetch_message(message.id)
    
    # Process the image
    await ctx.bot.scan_message_images(
        temp_msg,
        ctx.user,
        auto_scan=False,
        export_format=format,
        include_analysis=analysis,
        language=language
    )

@commands.slash_command(name="stats", description="📊 Show bot statistics and performance")
async def stats_command(ctx):
    """Show enhanced bot statistics"""
    await ctx.response.defer()
    
    bot = ctx.bot
    stats = bot.stats
    
    embed = discord.Embed(
        title="📊 **Enhanced MTG Scanner Statistics**",
        color=discord.Color.blue()
    )
    
    # Main stats
    embed.add_field(
        name="🔍 **Scanning Activity**",
        value=(
            f"**Scans Processed:** {stats['scans_processed']}\n"
            f"**Cards Identified:** {stats['cards_identified']}\n"
            f"**Auto-Corrections:** {stats['corrections_applied']}"
        ),
        inline=True
    )
    
    # Format detection
    if stats['formats_detected']:
        format_text = "\n".join([
            f"**{fmt.title()}:** {count}"
            for fmt, count in stats['formats_detected'].items()
        ])
        embed.add_field(
            name="🎲 **Formats Detected**",
            value=format_text,
            inline=True
        )
    
    # Service stats
    if bot.scryfall_service:
        cache_stats = bot.scryfall_service.get_cache_stats()
        embed.add_field(
            name="🚀 **Performance**",
            value=(
                f"**Cache Entries:** {cache_stats['total_entries']}\n"
                f"**Cache Hit Rate:** {cache_stats['cache_hit_ratio']:.1%}\n"
                f"**Memory Usage:** {cache_stats['cache_size_mb']:.2f}MB"
            ),
            inline=True
        )
    
    # OCR stats
    if bot.ocr_parser:
        ocr_stats = bot.ocr_parser.get_processing_stats()
        embed.add_field(
            name="🔤 **OCR Performance**",
            value=(
                f"**Validation Rate:** {ocr_stats['validation_rate']:.1f}%\n"
                f"**Correction Rate:** {ocr_stats['correction_rate']:.1f}%"
            ),
            inline=True
        )
    
    embed.set_footer(text="Enhanced MTG Scanner v2.0 - Powered by AI")
    
    await ctx.followup.send(embed=embed)

def main():
    """Enhanced main function"""
    # Check for Discord token
    TOKEN = os.getenv('DISCORD_BOT_TOKEN')
    
    if not TOKEN:
        logger.error("❌ DISCORD_BOT_TOKEN not found in environment variables!")
        logger.error("Please set your Discord bot token in the .env file")
        return
    
    # Initialize and run enhanced bot
    bot = MTGScannerBot()
    
    # Add slash commands
    bot.add_application_command(enhanced_scan_command)
    bot.add_application_command(stats_command)
    
    try:
        logger.info("🚀 Starting Enhanced MTG Scanner Bot...")
        bot.run(TOKEN)
    except KeyboardInterrupt:
        logger.info("👋 Bot shutdown requested")
    except Exception as e:
        logger.error(f"❌ Bot crashed: {e}")
    finally:
        if bot.scryfall_service:
            asyncio.run(bot.scryfall_service.__aexit__(None, None, None))

if __name__ == "__main__":
    main() 