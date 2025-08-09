# Unified Agent Catalog - MTGTools Subagents Collection

## Overview
This catalog contains 58 specialized AI agents merged from three repositories:
- **lst97/claude-code-sub-agents**: 37 agents (well-structured documentation)
- **wshobson/agents**: 44 agents (extensive language coverage)
- **webdevtodayjason/sub-agents**: 15 agents (CLI integration focus)

## Agent Categories

### 🎯 Coordination & Management (3 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **agent-organizer** | Master orchestrator for complex multi-agent tasks | lst97 | Complex project coordination |
| **context-manager** | Central nervous system maintaining real-time project understanding | lst97 | Context preservation |
| **project-planner** | Strategic planning specialist for project decomposition | jason | Project planning & breakdown |

### 💼 Business & Strategy (4 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **product-manager** | Strategic product vision, roadmaps, and cross-functional leadership | lst97 | Product strategy |
| **business-analyst** | Metrics analysis, reports, KPIs, and growth projections | wshobson | Business intelligence |
| **risk-manager** | Portfolio risk monitoring, hedging strategies, position limits | wshobson | Risk assessment |
| **quant-analyst** | Financial models, trading strategies, market data analysis | wshobson | Quantitative analysis |

### 🤖 AI & Data Science (6 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **ai-engineer** | LLM applications, RAG systems, and prompt pipelines | lst97 | AI system development |
| **data-engineer** | ETL/ELT pipelines, data warehouses, streaming architectures | lst97 | Data infrastructure |
| **data-scientist** | Advanced SQL, BigQuery optimization, actionable insights | lst97 | Data analysis |
| **ml-engineer** | End-to-end ML model lifecycle management in production | lst97 | ML operations |
| **mlops-engineer** | ML pipelines, experiment tracking, model registries | wshobson | MLOps infrastructure |
| **prompt-engineer** | Master prompt engineering for sophisticated LLM interactions | lst97 | Prompt optimization |

### ⚙️ Backend Development (8 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **backend-architect** | Consultative architect for robust, scalable backend systems | lst97 | System architecture |
| **api-developer** | Backend API development specialist for REST and GraphQL | jason | API development |
| **golang-pro** | Go expert for concurrent, performant applications | lst97 | Go development |
| **python-pro** | Expert Python developer with clean, performant code | lst97 | Python development |
| **java-pro** | Modern Java with streams, concurrency, JVM optimization | wshobson | Java development |
| **c-pro** | Efficient C code with memory management, system calls | wshobson | C programming |
| **cpp-pro** | Modern C++ with RAII, smart pointers, STL algorithms | wshobson | C++ development |
| **rust-pro** | Idiomatic Rust with ownership patterns, safe concurrency | wshobson | Rust development |

### 🎨 Frontend Development (8 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **frontend-developer** | Senior frontend engineer with React focus | lst97 | Frontend architecture |
| **react-pro** | Expert React developer with modern patterns | lst97 | React development |
| **nextjs-pro** | Expert Next.js developer with SSR/SSG mastery | lst97 | Next.js applications |
| **typescript-pro** | TypeScript expert for scalable, type-safe applications | lst97 | TypeScript development |
| **javascript-pro** | Modern JavaScript with ES6+, async patterns | wshobson | JavaScript development |
| **mobile-developer** | Cross-platform mobile with React Native/Flutter | lst97 | Mobile apps |
| **ios-developer** | Native iOS development with Swift/SwiftUI | wshobson | iOS apps |
| **shadcn-ui-builder** | UI/UX specialist for ShadCN UI components | jason | UI component development |

### 🔗 Full Stack & Integration (3 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **full-stack-developer** | Versatile end-to-end application development | lst97 | Full stack projects |
| **electron-pro** | Cross-platform desktop applications with Electron | lst97 | Desktop applications |
| **payment-integration** | Stripe, PayPal, payment processors integration | wshobson | Payment systems |

### 🗄️ Database & Storage (4 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **database-optimizer** | Holistic database performance analysis and optimization | lst97 | DB performance |
| **postgresql-pglite-pro** | PostgreSQL expert with Pglite browser solutions | lst97 | PostgreSQL |
| **graphql-architect** | High-performance, scalable GraphQL APIs | lst97 | GraphQL APIs |
| **sql-pro** | Complex SQL queries, optimization, schema design | wshobson | SQL development |

### 🚀 DevOps & Infrastructure (8 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **cloud-architect** | Scalable, secure AWS/Azure/GCP infrastructure | lst97 | Cloud architecture |
| **devops-engineer** | CI/CD, infrastructure automation, deployment | jason | DevOps practices |
| **deployment-engineer** | Robust CI/CD pipelines, container orchestration | lst97 | Deployment automation |
| **terraform-specialist** | Advanced Terraform modules, IaC best practices | wshobson | Infrastructure as Code |
| **network-engineer** | Network connectivity, load balancers, traffic analysis | wshobson | Network infrastructure |
| **performance-engineer** | Comprehensive performance strategy across lifecycle | lst97 | Performance optimization |
| **incident-responder** | Battle-tested incident commander for critical issues | lst97 | Incident management |
| **devops-troubleshooter** | Production debugging, logs analysis, outage response | wshobson | Troubleshooting |

### ✅ Quality & Testing (5 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **code-reviewer-pro** | Comprehensive code reviews for quality and security | lst97 | Code quality |
| **architect-reviewer** | Architectural consistency and pattern adherence | lst97 | Architecture review |
| **tdd-specialist** | Test-Driven Development specialist | jason | TDD practices |
| **test-automator** | Comprehensive automated testing strategy | lst97 | Test automation |
| **test-runner** | Automated test execution and failure fixing | jason | Test execution |

### 🔒 Security (2 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **security-auditor** | Senior application security auditor and ethical hacker | lst97 | Security audits |
| **security-scanner** | Security vulnerability scanner with fix suggestions | jason | Vulnerability scanning |

### 📚 Documentation & Communication (5 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **documentation-expert** | Comprehensive software documentation specialist | lst97 | Technical documentation |
| **api-documenter** | Developer-first API documentation specialist | lst97 | API documentation |
| **content-marketer** | Blog posts, social media, email newsletters | wshobson | Content creation |
| **marketing-writer** | Technical marketing and product messaging | jason | Marketing content |
| **customer-support** | Support tickets, FAQ, troubleshooting guides | wshobson | Customer support |

### 🛠️ Specialized Tools (2 agents)

| Agent | Description | Source | Primary Use |
|-------|-------------|--------|-------------|
| **debugger** | Debugging specialist for errors and test failures | lst97 | Debugging |
| **search-specialist** | Expert web researcher with advanced techniques | wshobson | Research |

## Usage Guidelines

### For MTGTools Projects
1. **API Development**: Use `api-developer`, `graphql-architect`, and `api-documenter`
2. **Data Analysis**: Use `data-scientist` for tournament data analysis
3. **Community Tools**: Use `product-manager` and `project-planner` for feature planning
4. **Performance**: Use `performance-engineer` for MTGO integration optimization

### Best Practices
1. Start with `agent-organizer` for complex multi-step tasks
2. Use `context-manager` to maintain project context across sessions
3. Combine specialists (e.g., `backend-architect` + `database-optimizer`)
4. Always include `code-reviewer-pro` before deployments

## Implementation Status
- ✅ Agents cataloged and deduplicated
- ⏳ Next: Copy agent files to organized directories
- ⏳ Next: Standardize agent format across all sources
- ⏳ Next: Create MTGTools-specific agents