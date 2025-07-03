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

from ocr_parser_advanced import MTGOCRParser, ParseResult, ParsedCard
from scryfall_service import ScryfallService, DeckAnalysis
from deck_processor import DeckProcessor
from utils.logger import setup_logger

# Configuration du logger
logger = setup_logger()

def format_error_field(title: str, lines: List[str], max_length: int = 1024) -> Optional[tuple]:
    """
    🔧 FONCTION ANTI-CRASH
    Formate une liste de lignes d'erreur pour un champ d'embed Discord,
    en s'assurant de ne jamais dépasser la longueur maximale.
    """
    if not lines:
        return None

    # Construit la chaîne de caractères à partir de la liste
    full_text = "\n".join(f"- `{line[:50]}{'...' if len(line) > 50 else ''}`" for line in lines)
    
    # Si le texte est déjà dans les limites, on le renvoie
    if len(full_text) <= max_length:
        return (title, full_text)

    # Sinon, on tronque intelligemment
    truncated_text = ""
    lines_included = 0
    for line in lines:
        line_to_add = f"- `{line[:50]}{'...' if len(line) > 50 else ''}`\n"
        if len(truncated_text) + len(line_to_add) > max_length - 100: # Garde une marge
            break
        truncated_text += line_to_add
        lines_included += 1
    
    remaining_lines = len(lines) - lines_included
    if remaining_lines > 0:
        truncated_text += f"\n... et {remaining_lines} autre(s) ligne(s) non reconnue(s)."

    return (title, truncated_text.strip())

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

# Créer l'instance du bot Pycord
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.guild_messages = True
intents.reactions = True

bot = commands.Bot(
    command_prefix='!',
    intents=intents,
    description='🃏 Enhanced MTG Deck Scanner - AI-powered deck analysis with Scryfall!',
    help_command=commands.DefaultHelpCommand(no_category='Commands')
)

# Attributs globaux du bot
bot.api_base_url = os.getenv('API_BASE_URL', 'http://localhost:3001/api')
bot.max_file_size = 10 * 1024 * 1024  # 10MB
bot.supported_formats = ['png', 'jpg', 'jpeg', 'gif', 'webp']
bot.camera_emoji = '📷'
bot.scryfall_service = ScryfallService()
bot.ocr_parser = MTGOCRParser(bot.scryfall_service)
bot.processing_jobs = {}
bot.stats = {
    'scans_processed': 0,
    'cards_identified': 0,
    'corrections_applied': 0,
    'formats_detected': {}
}

# Events
@bot.event
async def setup_hook():
    print(">>> setup_hook called")
    logger.info("🚀 Initializing Enhanced MTG Scanner Bot...")
    logger.info("✅ Enhanced bot services initialized successfully!")
    logger.info("🔧 Features: Auto-correction, Format detection, Intelligent validation")
    # Initialisation asynchrone de ScryfallService
    await bot.scryfall_service.__aenter__()

@bot.event
async def on_ready():
    """Called when bot is ready"""
    logger.info(f'🤖 {bot.user} is now online!')
    logger.info(f'📊 Connected to {len(bot.guilds)} guilds')
    
    # Set enhanced bot activity
    activity = discord.Activity(
        type=discord.ActivityType.watching,
        name="for MTG decks 🧠 AI-powered scanning!"
    )
    await bot.change_presence(activity=activity)

@bot.event
async def on_message(message):
    """Handle incoming messages with enhanced detection"""
    # Ignore bot messages
    if message.author.bot:
        return
    
    # Process attachments for images
    if message.attachments:
        await handle_image_attachments(message)
    
    # Process commands
    await bot.process_commands(message)

@bot.event
async def on_reaction_add(reaction, user):
    """
    Handle reaction additions with corrected logic.
    Triggers scan only when a non-bot user clicks the camera emoji.
    """
    # 1. Ignorer les actions du bot lui-même pour éviter les boucles infinies
    if user.bot:
        return

    # 2. Vérifier que la réaction est bien la bonne (📷)
    # 3. Vérifier que le message contient bien une image
    if str(reaction.emoji) == bot.camera_emoji and reaction.message.attachments:
        
        # Sécurité anti-spam : vérifier si un scan n'est pas déjà en cours pour ce message
        if reaction.message.id in bot.processing_jobs and bot.processing_jobs[reaction.message.id]:
            logger.warning(f"Scan already in progress for message {reaction.message.id}. Ignoring new reaction.")
            return

        # Lancer le scan
        logger.info(f"User {user.name} triggered scan for message {reaction.message.id}")
        await scan_message_images(reaction.message, user, auto_scan=True)

async def handle_image_attachments(message):
    """Add camera emoji to messages with image attachments"""
    has_image = any(
        attachment.filename.lower().split('.')[-1] in bot.supported_formats
        for attachment in message.attachments
    )
    
    if has_image:
        await message.add_reaction(bot.camera_emoji)

async def scan_message_images(message, user, auto_scan=False, 
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
        if att.filename.lower().split('.')[-1] in bot.supported_formats
    ]
    
    if not image_attachments:
        if not auto_scan:
            await message.reply("❌ No supported image formats found!")
        return
    
    # Process first image
    attachment = image_attachments[0]
    
    if attachment.size > bot.max_file_size:
        await message.reply(f"❌ Image too large! Max size: {bot.max_file_size // (1024*1024)}MB")
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
            parse_result: ParseResult = await bot.ocr_parser.parse_deck_image(
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
            await send_enhanced_scan_results(
                message,
                processing_msg,
                parse_result,
                export_format,
                include_analysis,
                user
            )
            
            # Update statistics
            bot.stats['scans_processed'] += 1
            bot.stats['cards_identified'] += len([c for c in parse_result.cards if c.is_validated])
            bot.stats['corrections_applied'] += len([c for c in parse_result.cards if c.correction_applied])
            
            if parse_result.format_analysis:
                format_name = parse_result.format_analysis.get('format', 'unknown')
                bot.stats['formats_detected'][format_name] = bot.stats['formats_detected'].get(format_name, 0) + 1
            
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

async def send_enhanced_scan_results(original_message, processing_msg, 
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
    
    # Unvalidated cards (suggestions) - ANTI-CRASH avec format_error_field
    if unvalidated_cards:
        unvalidated_lines = [card.original_text for card in unvalidated_cards]
        error_field = format_error_field("⚠️ **Needs Review**", unvalidated_lines)
        
        if error_field:
            result_embed.add_field(
                name=error_field[0],
                value=error_field[1],
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
    
    # Processing details (limited to Discord's 1024 char limit)
    if parse_result.processing_notes:
        processing_text = "\n".join(parse_result.processing_notes[-3:])  # Last 3 notes
        # Truncate if too long for Discord embed field (max 1024 chars)
        if len(processing_text) > 900:  # Leave room for code block markers
            processing_text = processing_text[:900] + "..."
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
    view = EnhancedDeckView(parse_result, bot.scryfall_service, user.id)
    
    # Generate export file
    export_content = await generate_enhanced_export(parse_result, export_format)
    
    file = None
    if export_content:
        file = discord.File(
            BytesIO(export_content.encode('utf-8')),
            filename=f"deck_scan_{export_format}.txt"
        )
    
    # Send result
    await processing_msg.edit(embed=result_embed, view=view, attachments=[file] if file else [])

async def generate_enhanced_export(parse_result: ParseResult, format_type: str) -> str:
    """
    VERSION PATCHÉE - Génère l'export en utilisant TOUJOURS les données regroupées
    
    PRIORITÉ :
    1. parse_result.export_text (déjà généré avec regroupement)
    2. parse_result.processed_cards (données intermédiaires regroupées)
    3. Regroupement manuel depuis parse_result.cards (Fallback de sécurité)
    """
    logger.info(f"🎯 Génération de l'export {format_type} avec la logique patchée")

    # CAS 1 : La meilleure situation. L'export est déjà prêt.
    if hasattr(parse_result, 'export_text') and parse_result.export_text:
        logger.info("  [Priorité 1] ✅ Utilisation de l'attribut 'export_text' pré-généré")
        return parse_result.export_text

    # CAS 2 : Les cartes ont été traitées et regroupées.
    elif hasattr(parse_result, 'processed_cards') and parse_result.processed_cards:
        logger.info("  [Priorité 2] ✅ Génération de l'export à partir de 'processed_cards'")
        processor = DeckProcessor()
        return processor.export_to_format(parse_result.processed_cards, format_type)

    # CAS 3 : Fallback. Les données brutes existent mais n'ont pas été traitées.
    # Cela indique un problème en amont, mais on peut le rattraper ici.
    elif hasattr(parse_result, 'cards') and parse_result.cards:
        logger.warning("  [Priorité 3] ⚠️ 'export_text' et 'processed_cards' sont absents. Exécution d'un regroupement de secours")

        # Séparer les cartes validées seulement
        validated_cards = [c for c in parse_result.cards if c.is_validated]
        
        main_tuples = []
        side_tuples = []
        for card in validated_cards:
            tuple_card = (card.name, card.quantity)
            if hasattr(card, 'is_sideboard') and card.is_sideboard:
                side_tuples.append(tuple_card)
            else:
                main_tuples.append(tuple_card)
        
        logger.debug(f"    Données brutes : {len(main_tuples)} lignes main, {len(side_tuples)} lignes side")
        
        processor = DeckProcessor(strict_mode=False)  # Mode non-strict pour ne pas bloquer l'export
        processed_cards, validation = processor.process_deck(main_tuples, side_tuples)
        
        logger.info(f"    Données regroupées : {validation.main_count} cartes main, {validation.side_count} cartes side")
        
        if not validation.is_valid:
            logger.error(f"    Validation du fallback échouée : {validation.errors}")
            
        return processor.export_to_format(processed_cards, format_type)

    # CAS 4 : Erreur critique. Aucune donnée de carte n'est disponible.
    else:
        logger.error("  ❌ ERREUR CRITIQUE: Aucune donnée de carte ('cards', 'processed_cards', 'export_text') n'a été trouvée dans parse_result")
        return "# Erreur: Aucune carte détectée ou les données sont corrompues.\n"

# --- Fonctions globales pour les boutons ---
async def create_stats_embed(parse_result):
    embed = discord.Embed(
        title="📊 **Detailed Deck Statistics**",
        color=discord.Color.blue()
    )
    validated_cards = [c for c in parse_result.cards if c.is_validated]
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
            f"**Scan Confidence:** {parse_result.confidence_score:.1%}"
        ),
        inline=True
    )
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

async def generate_analysis_report(parse_result):
    lines = [
        "# MTG Deck Analysis Report",
        "# Generated by Enhanced MTG Scanner v2.0",
        "",
        f"## Scan Results",
        f"- Confidence Score: {parse_result.confidence_score:.1%}",
        f"- Cards Processed: {len(parse_result.cards)}",
        f"- Cards Validated: {len([c for c in parse_result.cards if c.is_validated])}",
        f"- Auto-Corrections: {len([c for c in parse_result.cards if c.correction_applied])}",
        ""
    ]
    if parse_result.format_analysis:
        fa = parse_result.format_analysis
        lines.extend([
            "## Format Analysis",
            f"- Detected Format: {fa.get('format', 'Unknown')}",
            f"- Total Cards: {fa.get('total_cards', 0)}",
            f"- Color Identity: {', '.join(fa.get('color_identity', []))}",
            f"- Estimated Tier: {fa.get('estimated_tier', 'Unknown')}",
            f"- Price Estimate: ${fa.get('price_estimate', 0):.2f}",
            ""
        ])
    validated_cards = [c for c in parse_result.cards if c.is_validated]
    if validated_cards:
        lines.extend([
            "## Validated Cards",
            ""
        ])
        for card in validated_cards:
            correction_note = " (Auto-corrected)" if card.correction_applied else ""
            lines.append(f"{card.quantity}x {card.name}{correction_note}")
        lines.append("")
    if parse_result.processing_notes:
        lines.extend([
            "## Processing Details",
            ""
        ])
        for note in parse_result.processing_notes:
            lines.append(f"- {note}")
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
        content = await generate_enhanced_export(self.parse_result, 'mtga')
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
        content = await generate_enhanced_export(self.parse_result, 'moxfield')
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
        embed = await create_stats_embed(self.parse_result)
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @discord.ui.button(label="Analysis Report", style=discord.ButtonStyle.secondary, emoji="🔍")
    async def detailed_analysis(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Only the original requester can use this.", ephemeral=True)
            return
        content = await generate_analysis_report(self.parse_result)
        file = discord.File(BytesIO(content.encode('utf-8')), filename="deck_analysis.txt")
        await interaction.response.send_message(
            "🔍 **Detailed Analysis Report**\nComprehensive deck breakdown with AI insights!",
            file=file,
            ephemeral=True
        )

def main():
    """Enhanced main function"""
    # Check for Discord token
    TOKEN = os.getenv('DISCORD_BOT_TOKEN')
    
    if not TOKEN:
        logger.error("❌ DISCORD_BOT_TOKEN not found in environment variables!")
        logger.error("Please set your Discord bot token in the .env file")
        return
    
    # Initialize and run enhanced bot
    bot.run(TOKEN)

if __name__ == "__main__":
    main() 