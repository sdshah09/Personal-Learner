# Weekly Report Flow

## Overview

This document describes the flow for generating weekly summaries based on user entries across different domains.

## Process Flow

### Step 1: User Request

Claude receives the request: **"Give me weekly summary"**

### Step 2: Fetch All User Domains

Claude queries all domains for the user:

```sql
SELECT * FROM domains WHERE userId = 1
```

**Result:** `[DSA, founding_engineer, infra, k8s, sql]`

### Step 3: Query Entries for Each Domain

For each domain, Claude queries entries from the past 7 days:

#### DSA (id: 1)

```sql
SELECT * FROM entries 
WHERE userId = 1 
AND date >= (today - 7 days)
AND domains @> ARRAY[1]
```

**Result:** Entry 1, Entry 5, Entry 7

#### Founding Engineer (id: 2)

```sql
SELECT * FROM entries 
WHERE userId = 1 
AND date >= (today - 7 days)
AND domains @> ARRAY[2]
```

**Result:** Entry 2, Entry 6

#### Infra (id: 3)

```sql
SELECT * FROM entries 
WHERE userId = 1 
AND date >= (today - 7 days)
AND domains @> ARRAY[3]
```

**Result:** Entry 2

#### Kubernetes (id: 4)

```sql
SELECT * FROM entries 
WHERE userId = 1 
AND date >= (today - 7 days)
AND domains @> ARRAY[4]
```

**Result:** (empty - 0 entries)

#### SQL (id: 5)

```sql
SELECT * FROM entries 
WHERE userId = 1 
AND date >= (today - 7 days)
AND domains @> ARRAY[5]
```

**Result:** Entry 3

### Step 4: Analyze and Summarize Content

Claude reads the content for each domain and generates summaries:

- **DSA:** 3 entries → "You crushed binary search, tackled graphs"
- **Founding Engineer:** 2 entries → "Built Go service, debugged JWT"
- **Infra:** 1 entry → "Learned load balancing"
- **Kubernetes:** 0 entries → "Gap identified - didn't touch Kubernetes"
- **SQL:** 1 entry → "Optimized queries"

### Step 5: Generate Weekly Report

Claude generates the final report:

> This week you focused on DSA, backend, and infra.
> 
> - **DSA (3 days):** Mastered binary search, conquered edge cases, tackled graphs.
> - **Backend (2 days):** Built Go services, debugged JWT.
> - **Infra (1 day):** Learned load balancing.
> - **Gap: Kubernetes (0 entries)** - recommend studying this week.
> - **Gap: SQL (1 entry)** - consider deeper dives.

## Key Points

- Queries use PostgreSQL array operator `@>` to check if domain ID exists in the `domains` array
- Date range filter: `date >= (today - 7 days)` for weekly scope
- Empty results indicate gaps in learning that can be highlighted in the report
- Each domain is analyzed independently to provide domain-specific insights
