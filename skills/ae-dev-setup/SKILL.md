---
name: ae-dev-setup
description: Automated dev environment setup for deadline-cloud-for-after-effects. Use when onboarding, setting up the After Effects integration repo, building the submitter, or installing dependencies. The agent automates all steps and only prompts when user input is required.
tags: [skill, deadline-cloud, deadline-cloud-for-after-effects, dev-setup, onboarding, after-effects, compositing]
---

# After Effects Dev Setup

## Overview

AI-guided automated setup for the `deadline-cloud-for-after-effects` project. The agent executes all steps, validates results, and only prompts the user when manual intervention is truly required.

## Usage

Use this skill when:
- Setting up a new dev environment for the After Effects integration
- Onboarding to the `deadline-cloud-for-after-effects` repo
- Building the submitter script for the first time

## Core Concepts

**Platform:** Windows or macOS. After Effects 2024–2026, Python 3.9+.

**Build system:** Hatch (Python), jsxbundler (ExtendScript)

## Agent Behavior

You **MUST** automate all possible steps by running commands directly.
You **MUST** only prompt the user when their input is required (AE version, custom paths).
You **MUST** validate each step's output before proceeding to the next.
You **MUST** inform the user clearly when manual intervention is needed (e.g., installing After Effects itself).
You **SHOULD** report progress at each step.

## Setup Workflow

Follow the detailed step-by-step workflow in [references/setup-guide.md](references/setup-guide.md).

Summary of steps:
1. Detect OS (Windows or macOS)
2. Verify Python 3.9+
3. Detect After Effects installation
4. Install Hatch
5. Install dependencies (`hatch run sync`)
6. Build the submitter script (`jsxbundler.py`)
7. Copy dist files to After Effects ScriptUI Panels folder (optional if using installer)
8. Install `fonttools` dependency
9. Display summary
