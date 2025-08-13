#!/usr/bin/env python3
"""
📋 Clipboard Service - Service de copie dans le presse-papier pour Discord Bot
Permet aux utilisateurs de copier facilement leur deck depuis Discord
"""

import logging
from typing import List, Optional
from dataclasses import dataclass
import discord
from io import BytesIO
import hashlib
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class DeckCache:
    """Cache temporaire pour stocker les derniers decks scannés"""
    deck_content: str
    format_type: str
    user_id: int
    timestamp: datetime
    
class ClipboardService:
    """Service pour gérer la copie de decks dans le presse-papier depuis Discord"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.ClipboardService")
        # Cache des derniers decks pour chaque utilisateur
        self.user_deck_cache = {}
        # Durée de vie du cache en minutes
        self.cache_ttl = 30
        
    def cache_deck(self, user_id: int, deck_content: str, format_type: str = 'mtga'):
        """Met en cache le dernier deck d'un utilisateur"""
        self.user_deck_cache[user_id] = DeckCache(
            deck_content=deck_content,
            format_type=format_type,
            user_id=user_id,
            timestamp=datetime.now()
        )
        self.logger.info(f"📦 Deck mis en cache pour l'utilisateur {user_id}")
        self._clean_old_cache()
        
    def get_cached_deck(self, user_id: int) -> Optional[DeckCache]:
        """Récupère le deck en cache pour un utilisateur"""
        if user_id in self.user_deck_cache:
            cached = self.user_deck_cache[user_id]
            # Vérifier si le cache n'est pas expiré
            if datetime.now() - cached.timestamp < timedelta(minutes=self.cache_ttl):
                return cached
            else:
                # Cache expiré, le supprimer
                del self.user_deck_cache[user_id]
                self.logger.info(f"🗑️ Cache expiré pour l'utilisateur {user_id}")
        return None
        
    def _clean_old_cache(self):
        """Nettoie les entrées de cache expirées"""
        current_time = datetime.now()
        expired_users = []
        
        for user_id, cache in self.user_deck_cache.items():
            if current_time - cache.timestamp > timedelta(minutes=self.cache_ttl):
                expired_users.append(user_id)
                
        for user_id in expired_users:
            del self.user_deck_cache[user_id]
            
        if expired_users:
            self.logger.info(f"🧹 Nettoyage du cache: {len(expired_users)} entrées supprimées")
            
    def create_copy_embed(self, deck_content: str, format_type: str = 'mtga') -> discord.Embed:
        """Crée un embed avec le deck formaté pour la copie"""
        # Limiter la longueur pour Discord (max 4096 caractères pour la description)
        truncated = False
        max_length = 3900  # Garder une marge pour le formatage
        
        if len(deck_content) > max_length:
            deck_content = deck_content[:max_length] + "\n... (tronqué)"
            truncated = True
            
        embed = discord.Embed(
            title=f"📋 **Deck prêt à copier ({format_type.upper()})**",
            description=f"```\n{deck_content}\n```",
            color=discord.Color.green()
        )
        
        # Instructions selon la plateforme
        instructions = [
            "**Sur PC/Mac:**",
            "• Cliquez sur le texte ci-dessus",
            "• Ctrl+A (ou Cmd+A) pour tout sélectionner", 
            "• Ctrl+C (ou Cmd+C) pour copier",
            "",
            "**Sur Mobile:**",
            "• Appuyez longuement sur le texte",
            "• Sélectionnez 'Tout sélectionner'",
            "• Appuyez sur 'Copier'"
        ]
        
        embed.add_field(
            name="💡 **Comment copier**",
            value="\n".join(instructions),
            inline=False
        )
        
        if truncated:
            embed.add_field(
                name="⚠️ **Note**",
                value="Le deck a été tronqué car il était trop long. Utilisez le fichier attaché pour la version complète.",
                inline=False
            )
            
        embed.set_footer(text=f"Format: {format_type.upper()} • Copiez et collez directement dans votre application")
        
        return embed
        
    def create_copy_instructions_text(self, format_type: str = 'mtga') -> str:
        """Crée des instructions textuelles pour la copie"""
        instructions = {
            'mtga': (
                "**Pour importer dans MTG Arena:**\n"
                "1. Copiez le texte du deck ci-dessus\n"
                "2. Dans Arena, allez dans Decks\n"
                "3. Cliquez sur 'Importer' en bas\n"
                "4. Le deck sera automatiquement détecté"
            ),
            'moxfield': (
                "**Pour importer dans Moxfield:**\n"
                "1. Copiez le texte du deck ci-dessus\n"
                "2. Sur Moxfield, créez un nouveau deck\n"
                "3. Cliquez sur 'Bulk Import'\n"
                "4. Collez le texte et validez"
            ),
            'archidekt': (
                "**Pour importer dans Archidekt:**\n"
                "1. Copiez le texte du deck ci-dessus\n"
                "2. Sur Archidekt, créez un nouveau deck\n"
                "3. Utilisez l'option 'Mass Entry'\n"
                "4. Collez et importez"
            ),
            'tappedout': (
                "**Pour importer dans TappedOut:**\n"
                "1. Copiez le texte du deck ci-dessus\n"
                "2. Sur TappedOut, créez un nouveau deck\n"
                "3. Utilisez 'Quick Add'\n"
                "4. Collez le texte dans la zone"
            )
        }
        
        return instructions.get(format_type, instructions['mtga'])
        
    async def send_copyable_deck(self, interaction: discord.Interaction, 
                                deck_content: str, format_type: str = 'mtga'):
        """Envoie un deck dans un format facilement copiable"""
        # Créer l'embed avec le deck
        embed = self.create_copy_embed(deck_content, format_type)
        
        # Ajouter les instructions spécifiques au format
        instructions = self.create_copy_instructions_text(format_type)
        
        # Si le deck est trop long, créer aussi un fichier
        files = []
        if len(deck_content) > 3900:
            file = discord.File(
                BytesIO(deck_content.encode('utf-8')),
                filename=f"deck_{format_type}.txt"
            )
            files.append(file)
            
        # Envoyer la réponse
        await interaction.response.send_message(
            content=instructions,
            embed=embed,
            files=files,
            ephemeral=True  # Message visible uniquement par l'utilisateur
        )
        
    def generate_deck_id(self, deck_content: str) -> str:
        """Génère un ID unique pour un deck basé sur son contenu"""
        return hashlib.md5(deck_content.encode()).hexdigest()[:8]

class CopyDeckButton(discord.ui.Button):
    """Bouton personnalisé pour copier un deck"""
    
    def __init__(self, deck_content: str, format_type: str = 'mtga', 
                 clipboard_service: ClipboardService = None):
        super().__init__(
            label="Copy Deck",
            style=discord.ButtonStyle.success,
            emoji="📋"
        )
        self.deck_content = deck_content
        self.format_type = format_type
        self.clipboard_service = clipboard_service or ClipboardService()
        
    async def callback(self, interaction: discord.Interaction):
        """Action quand le bouton est cliqué"""
        await self.clipboard_service.send_copyable_deck(
            interaction, 
            self.deck_content, 
            self.format_type
        )

class QuickCopyView(discord.ui.View):
    """Vue avec tous les boutons de copie rapide pour différents formats"""
    
    def __init__(self, deck_content: str, clipboard_service: ClipboardService = None):
        super().__init__(timeout=600)  # 10 minutes
        self.deck_content = deck_content
        self.clipboard_service = clipboard_service or ClipboardService()
        
    @discord.ui.button(label="Copy MTGA", style=discord.ButtonStyle.primary, emoji="🎮")
    async def copy_mtga(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.clipboard_service.send_copyable_deck(
            interaction, self.deck_content, 'mtga'
        )
        
    @discord.ui.button(label="Copy Moxfield", style=discord.ButtonStyle.primary, emoji="📋")
    async def copy_moxfield(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.clipboard_service.send_copyable_deck(
            interaction, self.deck_content, 'moxfield'
        )
        
    @discord.ui.button(label="Copy Plain Text", style=discord.ButtonStyle.secondary, emoji="📝")
    async def copy_plain(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.clipboard_service.send_copyable_deck(
            interaction, self.deck_content, 'plain'
        )