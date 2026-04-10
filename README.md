# OpenGraph
### A Personal Intelligence System for Human Understanding

---

## Overview

OpenGraph is an open-source system that transforms fragmented personal data into a structured, queryable graph.

It allows individuals to move beyond searching files and instead *understand the relationships within their information*. By automatically organizing data into entities and connections, OpenGraph provides a foundation for reasoning, exploration, and insight.

> The goal is not to give people more data.  
> The goal is to help people understand what they already have.

---

## The Problem

Modern life generates vast amounts of information:
- documents
- emails
- notes
- spreadsheets
- links

Yet this information exists in isolation.

We can store it.  
We can search it.  
But we cannot truly *reason over it*.

Meanwhile, large institutions operate differently. They use advanced systems to:
- unify fragmented data
- resolve identities across sources
- map relationships between entities
- query complex systems in real time

This creates a quiet imbalance.

Organizations can understand systems.  
Individuals can only navigate fragments.

---

## Why This Matters

Knowledge without structure is noise.

Without the ability to connect information:
- patterns remain invisible  
- insights are lost  
- decisions rely on incomplete context  

OpenGraph exists to restore a fundamental capability:

> The ability for individuals to see, connect, and reason over their own information.

This is not about power over others.  
It is about clarity over one’s own data.

---

## What OpenGraph Does

OpenGraph ingests personal data and converts it into a graph of entities and relationships.

It identifies:
- people  
- organizations  
- documents  
- links between them  

Then it enables users to explore and query this structure.

Instead of asking:
> “Where is that file?”

You can ask:
> “What connects these two people?”  
> “Where does this idea appear?”  
> “Who shows up most often in my work?”  

---

## Core Features

### Data Ingestion
Import data from:
- local files (PDF, TXT, Markdown)  
- email (read-only access)  
- structured data (CSV)

---

### Entity Extraction
Automatically detects:
- people  
- organizations  
- emails  
- URLs  

---

### Entity Resolution
Merges references to the same real-world entity  
(e.g. “Sam Altman” and “S. Altman”)

---

### Graph Construction
Builds a network of:
- entities (nodes)  
- relationships (edges)  

---

### Query Engine
Ask questions over your data:
- natural language queries  
- structured graph queries  

---

### Graph Exploration
Interactively explore relationships:
- expand connections  
- filter entities  
- navigate through networks  

---

## What OpenGraph Is Not

- Not a note-taking app  
- Not a dashboard tool  
- Not a chatbot wrapper  
- Not a surveillance system  

OpenGraph is a **reasoning layer** over your own data.

---

## Design Principles

### 1. Structure over volume  
More data is not useful without organization.

### 2. Transparency over magic  
Users should understand how relationships are formed.

### 3. Local-first by default  
Your data remains under your control.

### 4. Useful before perfect  
The system should provide value early, even if incomplete.

---

## Example Use Cases

- Map relationships across documents and emails  
- Trace how ideas evolve over time  
- Identify recurring people or organizations  
- Explore hidden connections in your work  

 
## Set Up 

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
 
 