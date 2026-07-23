# AI Factory Super Agent

VP-ready interactive architecture mockup for intent-driven orchestration of specialized AI Factory agents, NVIDIA tools, evidence layers and governed outcomes.

## What this is

This is a front-end-only demonstrator. It does not call real NVIDIA or enterprise systems. It simulates how a Super Agent could decompose an engineering/business intent into specialized agents, NVIDIA-centered tool calls, RAG/evidence layers, harness controls and a governed outcome package.

## Stack

- React + Vite
- React Flow for pan, zoom, drag and fit-view
- Dagre for automatic graph layout
- Lucide React icons
- GitHub Pages deployment workflow

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deployment

The repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`.

To publish with GitHub Pages:

1. Go to repository **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` or run the workflow manually.

## Concept

The overall context is always the **AI Factory Super Agent**.

The dropdown named **Orchestration pattern** is only a demo lens used to force or auto-detect the mission type from the intent:

- Token-to-Twin Planning
- Requirements & DSX Baseline
- Multi-Simulation Campaign
- OpenUSD / SimReady Assets
- Operations Exception
- Interconnect Readiness
- Humanoid Robot Twin

Each pattern recomputes:

- specialized agents
- NVIDIA-centered tools / LLMs / APIs
- RAG and evidence route
- harness controls
- governed outcome
- side-panel detail for every specialized agent

## Realism boundaries

The mockup uses realistic NVIDIA-centered terminology such as Omniverse DSX Blueprint, OpenUSD, SimReady, NIM, NeMo Retriever, cuVS, PhysicsNeMo, cuOpt, DCGM and Run:ai. It does not imply any completed integration or production-ready capability. The purpose is to communicate a possible architecture and experience.
