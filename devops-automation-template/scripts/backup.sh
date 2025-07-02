#!/bin/bash

# Script de backup automatique
# Usage: ./backup.sh [backup-name]

BACKUP_NAME=${1:-"auto-$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="./backups"
PROJECT_NAME=$(basename "$PWD")

echo "💾 Backup: $BACKUP_NAME"

# 1. Create backup directory
setup_backup_dir() {
    echo "📁 Création répertoire backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    echo "✅ Répertoire prêt: $BACKUP_DIR"
}

# 2. Database backup
backup_database() {
    echo "🗄️ Backup base de données..."
    
    if [ -n "$DATABASE_URL" ]; then
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/${BACKUP_NAME}_database.sql"
        echo "✅ Backup database terminé"
    else
        echo "⚠️ DATABASE_URL non définie, backup database ignoré"
    fi
}

# 3. Environment backup
backup_environment() {
    echo "⚙️ Backup configuration..."
    
    # Backup des configs (sans secrets)
    cp fly.toml "$BACKUP_DIR/${BACKUP_NAME}_fly.toml" 2>/dev/null || true
    cp railway.json "$BACKUP_DIR/${BACKUP_NAME}_railway.json" 2>/dev/null || true
    cp package.json "$BACKUP_DIR/${BACKUP_NAME}_package.json" 2>/dev/null || true
    
    echo "✅ Backup configuration terminé"
}

# 4. Application state backup
backup_application_state() {
    echo "📱 Backup état application..."
    
    # Backup des uploads/files si applicable
    if [ -d "uploads" ]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz" uploads/
        echo "✅ Backup uploads terminé"
    fi
    
    # Backup des logs récents
    if [ -d "logs" ]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_logs.tar.gz" logs/
        echo "✅ Backup logs terminé"
    fi
}

# 5. Create backup manifest
create_manifest() {
    echo "📋 Création manifest backup..."
    
    MANIFEST_FILE="$BACKUP_DIR/${BACKUP_NAME}_manifest.json"
    
    cat > "$MANIFEST_FILE" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "project_name": "$PROJECT_NAME",
  "timestamp": "$(date -Iseconds)",
  "files": [
$(find "$BACKUP_DIR" -name "${BACKUP_NAME}_*" -not -name "*_manifest.json" | sed 's/.*/"&"/' | paste -sd, -)
  ],
  "size_mb": $(du -sm "$BACKUP_DIR" | cut -f1),
  "database_included": $([ -f "$BACKUP_DIR/${BACKUP_NAME}_database.sql" ] && echo "true" || echo "false")
}
EOF
    
    echo "✅ Manifest créé: $MANIFEST_FILE"
}

# 6. Upload to cloud storage (optional)
upload_to_cloud() {
    echo "☁️ Upload vers stockage cloud..."
    
    if [ -n "$CLOUDFLARE_R2_ACCESS_KEY_ID" ]; then
        # Upload vers Cloudflare R2
        aws s3 sync "$BACKUP_DIR" "s3://$CLOUDFLARE_R2_BUCKET_NAME/backups/" \
            --endpoint-url "$CLOUDFLARE_R2_ENDPOINT" \
            --region auto
        echo "✅ Upload R2 terminé"
    elif [ -n "$AWS_ACCESS_KEY_ID" ]; then
        # Upload vers AWS S3
        aws s3 sync "$BACKUP_DIR" "s3://your-backup-bucket/backups/"
        echo "✅ Upload S3 terminé"
    else
        echo "⚠️ Aucun cloud storage configuré, backup local uniquement"
    fi
}

# 7. Cleanup old backups
cleanup_old_backups() {
    echo "🧹 Nettoyage anciens backups..."
    
    # Garder les 30 derniers backups
    find "$BACKUP_DIR" -name "auto-*" -type f | sort | head -n -30 | xargs rm -f
    
    echo "✅ Nettoyage terminé"
}

# 8. Verify backup integrity
verify_backup() {
    echo "🔍 Vérification intégrité backup..."
    
    # Vérifier que les fichiers existent et ne sont pas vides
    if [ -f "$BACKUP_DIR/${BACKUP_NAME}_database.sql" ]; then
        if [ -s "$BACKUP_DIR/${BACKUP_NAME}_database.sql" ]; then
            echo "✅ Backup database valide"
        else
            echo "❌ Backup database vide"
            exit 1
        fi
    fi
    
    # Vérifier le manifest
    if [ -f "$BACKUP_DIR/${BACKUP_NAME}_manifest.json" ]; then
        if jq empty "$BACKUP_DIR/${BACKUP_NAME}_manifest.json" 2>/dev/null; then
            echo "✅ Manifest valide"
        else
            echo "❌ Manifest invalide"
            exit 1
        fi
    fi
    
    echo "✅ Backup vérifié"
}

# Execution
main() {
    echo "🚀 Démarrage backup..."
    echo "📦 Nom: $BACKUP_NAME"
    echo ""
    
    setup_backup_dir
    backup_database
    backup_environment
    backup_application_state
    create_manifest
    verify_backup
    upload_to_cloud
    cleanup_old_backups
    
    echo ""
    echo "🎉 Backup terminé avec succès !"
    echo "📁 Location: $BACKUP_DIR/${BACKUP_NAME}_*"
    echo "📊 Taille: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo ""
}

main "$@" 