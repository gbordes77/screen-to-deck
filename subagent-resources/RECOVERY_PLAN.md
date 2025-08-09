# Subagent Resources Recovery Plan

## Recommended Approach

### 1. Primary Source: lst97/claude-code-sub-agents
Clone and organize agents by category:
```bash
git clone https://github.com/lst97/claude-code-sub-agents.git temp-lst97
cp -r temp-lst97/subagents/* ./
```

### 2. Enrich with wshobson/agents
Add missing specialized agents:
```bash
git clone https://github.com/wshobson/agents.git temp-wshobson
# Manually review and import unique agents not in lst97
```

### 3. Directory Structure
```
subagent-resources/
├── development/
│   ├── frontend/
│   ├── backend/
│   └── languages/
├── infrastructure/
├── quality/
├── security/
├── data-ai/
├── business/
└── meta/
```

### 4. Standardization
- Use lst97's format as standard
- Convert wshobson's YAML headers to match
- Add model preferences from wshobson
- Create index.md with all agents listed

### 5. Custom Agents
Create MTGTools-specific agents:
- mtg-api-developer.md
- tournament-data-analyst.md
- community-manager.md
