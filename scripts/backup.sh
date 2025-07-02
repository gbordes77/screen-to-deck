#!/bin/bash

# ==============================================
# SCREEN-TO-DECK BACKUP SYSTEM
# Automated database backup & restore
# ==============================================

set -e

# Configuration
BACKUP_DIR="/backups"
BACKUP_RETENTION_DAYS=30
DB_HOST="${DB_HOST:-postgres}"
DB_NAME="${DB_NAME:-screen_to_deck}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️  $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
    exit 1
}

# ==============================================
# BACKUP FUNCTIONS
# ==============================================

create_backup() {
    info "Creating database backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    BACKUP_FILE="$BACKUP_DIR/screen_to_deck_${TIMESTAMP}.sql"
    
    if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
        log "Database backup created: $BACKUP_FILE"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        log "Backup compressed: ${BACKUP_FILE}.gz"
        
        # Create metadata
        cat > "$BACKUP_DIR/backup_${TIMESTAMP}.meta" << EOF
TIMESTAMP=$TIMESTAMP
DATE=$(date)
DB_HOST=$DB_HOST
DB_NAME=$DB_NAME
DB_USER=$DB_USER
SIZE=$(stat -f%z "${BACKUP_FILE}.gz" 2>/dev/null || stat -c%s "${BACKUP_FILE}.gz")
EOF
        
        # Upload to cloud storage (if configured)
        upload_to_cloud "${BACKUP_FILE}.gz"
        
    else
        error "Failed to create database backup"
    fi
}

upload_to_cloud() {
    local backup_file=$1
    
    # Upload to Cloudflare R2 if configured
    if [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_SECRET_ACCESS_KEY" ]; then
        info "Uploading backup to Cloudflare R2..."
        
        # Use AWS CLI with R2 endpoint
        aws s3 cp "$backup_file" "s3://${R2_BUCKET_NAME}/backups/" \
            --endpoint-url "https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com" \
            --region auto \
            --no-verify-ssl 2>/dev/null || warn "Cloud upload failed"
    fi
    
    # Upload to Supabase Storage if configured
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -n "$SUPABASE_URL" ]; then
        info "Uploading backup to Supabase Storage..."
        
        FILENAME=$(basename "$backup_file")
        curl -X POST \
            "$SUPABASE_URL/storage/v1/object/backups/$FILENAME" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Content-Type: application/gzip" \
            --data-binary "@$backup_file" > /dev/null 2>&1 || warn "Supabase upload failed"
    fi
}

restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        echo "Available backups:"
        list_backups
        echo ""
        read -p "Enter backup filename to restore: " backup_file
    fi
    
    if [ ! -f "$BACKUP_DIR/$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    warn "This will restore the database and OVERWRITE all current data!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        info "Restore cancelled"
        exit 0
    fi
    
    info "Restoring database from: $backup_file"
    
    # Extract if compressed
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$BACKUP_DIR/$backup_file" | psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"
    else
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/$backup_file"
    fi
    
    log "Database restored successfully"
}

list_backups() {
    info "Available backups in $BACKUP_DIR:"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
        warn "No backups found"
        return
    fi
    
    echo ""
    printf "%-30s %-15s %-10s\n" "FILENAME" "DATE" "SIZE"
    printf "%-30s %-15s %-10s\n" "--------" "----" "----"
    
    for file in "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.sql; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            
            # Try to get date from filename
            if [[ $filename =~ ([0-9]{8}_[0-9]{6}) ]]; then
                date_str="${BASH_REMATCH[1]}"
                formatted_date=$(date -d "${date_str:0:8} ${date_str:9:2}:${date_str:11:2}:${date_str:13:2}" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "Unknown")
            else
                formatted_date=$(date -r "$file" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "Unknown")
            fi
            
            # Get file size
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "Unknown")
            size_mb=$(echo "scale=1; $size / 1024 / 1024" | bc 2>/dev/null || echo "Unknown")
            
            printf "%-30s %-15s %-10s\n" "$filename" "$formatted_date" "${size_mb}MB"
        fi
    done
}

cleanup_old_backups() {
    info "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
        find "$BACKUP_DIR" -name "*.sql" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
        find "$BACKUP_DIR" -name "*.meta" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
        log "Old backups cleaned up"
    fi
}

schedule_backup() {
    info "Setting up automated backup schedule..."
    
    # Create cron job for daily backups
    CRON_JOB="0 2 * * * $PWD/scripts/backup.sh create && $PWD/scripts/backup.sh cleanup"
    
    # Add to crontab if not already present
    if ! crontab -l 2>/dev/null | grep -q "$PWD/scripts/backup.sh"; then
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        log "Daily backup scheduled at 2:00 AM"
    else
        log "Backup schedule already exists"
    fi
}

monitor_backup_size() {
    info "Monitoring backup disk usage..."
    
    if [ -d "$BACKUP_DIR" ]; then
        TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
        DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
        
        echo "Backup directory size: $TOTAL_SIZE"
        echo "Disk usage: ${DISK_USAGE}%"
        
        # Alert if disk usage is high
        if [ "$DISK_USAGE" -gt 85 ]; then
            warn "Disk usage is high (${DISK_USAGE}%)! Consider cleaning up old backups."
        fi
    fi
}

# ==============================================
# MAIN EXECUTION
# ==============================================

case "${1:-help}" in
    "create")
        create_backup
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "schedule")
        schedule_backup
        ;;
    "monitor")
        monitor_backup_size
        ;;
    "help"|*)
        echo "🗄️  Screen-to-Deck Backup System"
        echo ""
        echo "Usage: $0 {create|restore|list|cleanup|schedule|monitor}"
        echo ""
        echo "Commands:"
        echo "  create                    Create a new database backup"
        echo "  restore [filename]        Restore database from backup"
        echo "  list                      List available backups"
        echo "  cleanup                   Remove old backups"
        echo "  schedule                  Setup automated daily backups"
        echo "  monitor                   Show backup storage usage"
        echo ""
        echo "Environment variables:"
        echo "  DB_HOST                   Database host (default: postgres)"
        echo "  DB_NAME                   Database name (default: screen_to_deck)"
        echo "  DB_USER                   Database user (default: postgres)"
        echo "  PGPASSWORD                Database password"
        echo "  R2_ACCESS_KEY_ID          Cloudflare R2 access key"
        echo "  R2_SECRET_ACCESS_KEY      Cloudflare R2 secret key"
        echo "  SUPABASE_SERVICE_ROLE_KEY Supabase service role key"
        ;;
esac 