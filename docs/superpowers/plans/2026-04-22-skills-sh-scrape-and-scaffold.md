# skills.sh Full Scrape + Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape all 1,207 pages of skills.sh, extract structured data, rank the top 20 skills for a React Native/Expo + Supabase + AI wellness SaaS, and generate a complete project scaffold.

**Architecture:** Node.js scraper (axios + cheerio) runs against all sitemap URLs concurrently at 5 workers; outputs skills_raw.json + skills_clean.csv; analysis script produces recommended_skills.json ranked by project relevance; scaffold generator creates the full project directory tree with stub files.

**Tech Stack:** Node.js v24, axios, cheerio, fs (built-in), bash scripts for scaffold generation

---

## Phase 1 — Skill Audit Report

### 1.1 Currently Installed Skills/Tools

| Name | Type | Relevant to Task |
|------|------|-----------------|
| WebFetch | Built-in tool | CRITICAL — initial site exploration |
| WebSearch | Built-in tool | HIGH — discovery |
| Bash | Built-in tool | CRITICAL — run scrapers |
| Agent | Built-in tool | HIGH — parallel work |
| Write/Edit/Read | Built-in tools | CRITICAL — file output |
| Node.js v24.12.0 | Runtime | CRITICAL — scraping engine |
| npm v11.6.2 | Package manager | CRITICAL — install deps |
| using-superpowers | Skill | Navigation |
| brainstorming | Skill | Requirements |
| writing-plans | Skill | This document |
| executing-plans | Skill | Execution |
| dispatching-parallel-agents | Skill | Parallel scraping |
| systematic-debugging | Skill | Error handling |
| test-driven-development | Skill | Verification |
| verification-before-completion | Skill | Quality gate |
| claude-api | Skill | AI integration |
| security-review | Skill | Audit |

### 1.2 Skills Needed for This Task

| Skill | Purpose | Install | Priority |
|-------|---------|---------|---------|
| axios | HTTP client for scraping | npm install axios | CRITICAL |
| cheerio | HTML parsing (jQuery-style) | npm install cheerio | CRITICAL |
| Node.js | Runtime (already present) | — | CRITICAL |
| Playwright | JS-rendered content | npm install playwright | NICE-TO-HAVE |

### 1.3 Gap Analysis

| Gap | Status | Resolution |
|-----|--------|-----------|
| axios | Installed ✅ | npm install axios |
| cheerio | Installed ✅ | npm install cheerio |
| Playwright | Not needed ✅ | skills.sh is server-rendered HTML |

---

## Phase 2 — Install Dependencies

- [x] `npm install axios cheerio` in `docs/superpowers/skills-scrape/`

---

## Phase 3 — Scrape tasks

### Task 1: Write and run scraper

**Files:**
- Create: `docs/superpowers/skills-scrape/scraper.js`
- Output: `docs/superpowers/skills-scrape/skills_raw.json`
- Output: `docs/superpowers/skills-scrape/skills_clean.csv`
- Output: `docs/superpowers/skills-scrape/scrape_log.txt`

- [x] **Step 1: Write scraper.js**

Strategy: embed all 1,207 sitemap URLs, batch at CONCURRENCY=5, delay 800ms between batches, extract name/description/category/tags/installs/publisher from each page HTML via cheerio.

- [x] **Step 2: Run scraper**

```bash
cd docs/superpowers/skills-scrape && node scraper.js
```

Expected output: 1,203 skill pages scraped, ~200s runtime.

- [ ] **Step 3: Verify outputs**

```bash
wc -l docs/superpowers/skills-scrape/skills_clean.csv
cat docs/superpowers/skills-scrape/scrape_log.txt
```

Expected: 1,200+ rows in CSV, success rate >80%.

---

## Phase 4 — Skill Ranking for This Project

### Scoring criteria:
- React Native/Expo: weight 3x
- Supabase backend: weight 3x
- AI/ML (Claude): weight 2x
- Stripe/payments: weight 2x
- CI/CD (Vercel/EAS): weight 2x
- Colombian payroll compliance: weight 2x
- Security/Auth: weight 1x

### Top 20 Recommended Skills

| Rank | Skill | Category | Score | Reason |
|------|-------|----------|-------|--------|
| 1 | supabase | Database | 10 | Core backend |
| 2 | supabase-postgres-best-practices | Database | 10 | Payroll schemas |
| 3 | vercel-react-native-skills | Mobile | 10 | Primary platform |
| 4 | react-native-best-practices | Mobile | 10 | Callstack authority |
| 5 | expo/building-native-ui | Mobile | 10 | Expo patterns |
| 6 | stripe-best-practices | Payments | 10 | RevenueCat/Stripe |
| 7 | stripe-integration | Payments | 9 | Implementation |
| 8 | expo-deployment | DevOps | 9 | EAS Build |
| 9 | expo-cicd-workflows | DevOps | 9 | CI/CD |
| 10 | deploy-to-vercel | DevOps | 9 | API hosting |
| 11 | claude-api | AI/ML | 9 | AI mentor |
| 12 | nodejs-backend-patterns | Backend | 9 | Express API |
| 13 | auth-implementation-patterns | Security | 9 | JWT + biometric |
| 14 | nextjs-supabase-auth | Security | 8 | Admin panel |
| 15 | database-migration | Database | 8 | Schema changes |
| 16 | prisma-database-setup | Database | 8 | Type-safe ORM |
| 17 | react-native-architecture | Mobile | 8 | Scalable arch |
| 18 | github-actions-templates | DevOps | 8 | CI workflows |
| 19 | test-driven-development | Workflow | 8 | Payroll TDD |
| 20 | frontend-design | Design | 8 | Wellness UX |

---

## Phase 5 — Project Scaffold

### Task 2: Generate project structure

**Files:**
- Create: `docs/superpowers/skills-scrape/project_scaffold.md`

- [ ] **Step 1: Write scaffold**

See `project_scaffold.md` for the complete directory tree, key file contents, and setup instructions.

- [ ] **Step 2: Verify scaffold is complete**

Run: `find docs/superpowers/skills-scrape -name "*.md" | head -10`

- [ ] **Step 3: Commit all outputs**

```bash
git add docs/superpowers/skills-scrape/
git commit -m "feat: skills.sh full scrape + top 20 recommendations + project scaffold"
```
