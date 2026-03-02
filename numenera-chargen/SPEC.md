# SPECIFICATION: Numenera Character Sheet Generator

> **AUDIENCE**: This document is the sole specification for a coding agent (Claude) that will implement this project from scratch. It must be treated as the single source of truth. Every decision, constraint, rule, data structure, and behavioral expectation is defined here. If something is ambiguous or unspecified, the agent should ask before assuming.

> **DISTRIBUTION**: Private use only — this tool will be used by a small D&D/TTRPG group. Full game content from the SRD may be reproduced verbatim in data files and UI. No fan-use policy restrictions apply.

---

## TABLE OF CONTENTS

1. [Project Goal](#1-project-goal)
2. [Domain Knowledge: Numenera Character Creation Rules](#2-domain-knowledge)
3. [Tech Stack (Mandatory)](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Data Model: TypeScript Interfaces](#5-data-model)
6. [Game Data: Source, Extraction, and Format](#6-game-data)
7. [Engine Logic: Character Assembly Rules](#7-engine-logic)
8. [State Management](#8-state-management)
9. [UI Specification: Wizard Steps](#9-ui-specification)
10. [PDF Character Sheet Generation](#10-pdf-generation)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Implementation Order](#12-implementation-order)
13. [Known Edge Cases](#13-edge-cases)
14. [Testing Requirements](#14-testing-requirements)
15. [Reference: Example Character Build (Golden Path Test)](#15-golden-path)

---

<a id="1-project-goal"></a>
## 1. PROJECT GOAL

Build a client-side web application that:

1. Walks a user through Numenera 2E character creation step by step.
2. At each step, presents the valid options (Types, Descriptors, Foci) with full descriptions.
3. Prompts the user to allocate stat pool points and select skills/abilities based on the combination they have chosen.
4. Computes final character stats by layering Type → Descriptor → Focus rules, resolving conflicts.
5. Generates a filled-out, downloadable PDF character sheet.

The application is fully client-side. There is no backend, no database, no user accounts. All game data is bundled as static JSON files shipped with the app.

---

<a id="2-domain-knowledge"></a>
## 2. DOMAIN KNOWLEDGE: NUMENERA CHARACTER CREATION RULES

This section contains the game rules the agent MUST understand to implement the engine correctly. All game mechanics referenced throughout this spec originate here.

### 2.1 The Character Sentence

Every Numenera character is defined by a sentence:

**"I am a [Descriptor] [Type] who [Focus]."**

- **Type** (noun): The character's class. There are 6 Types: **Glaive** (warrior), **Nano** (mage), **Jack** (rogue/generalist), **Arkus** (leader/politician), **Delve** (explorer/scavenger), **Wright** (crafter/builder).
- **Descriptor** (adjective): A personality/trait package. Examples: Charming, Tough, Graceful, Stealthy, Learned, etc. There are ~50+ Descriptors across multiple sources (Discovery, Destiny, Location-Based, Racial).
- **Focus** (verb phrase): A special talent or power. Examples: "Bears a Halo of Fire", "Wields Two Weapons", "Explores Dark Places". There are ~40+ Foci.

### 2.2 The Three Stat Pools

Every character has exactly three stats, each with two components:

| Stat | Governs | Pool | Edge |
|------|---------|------|------|
| **Might** | Physical strength, health, melee power | Resource pool (HP-like) | Discount on Might costs |
| **Speed** | Agility, reflexes, ranged attacks, dodging | Resource pool | Discount on Speed costs |
| **Intellect** | Mental ability, knowledge, social, numenera use | Resource pool | Discount on Intellect costs |

- **Pool**: A spendable resource. Characters spend pool points to activate abilities and apply Effort to tasks. Damage also reduces pools. When all three pools reach 0, the character dies.
- **Edge**: A permanent discount. When a character spends points from a pool, Edge reduces the cost (minimum 0). Edge of 1 in Might means every Might cost is reduced by 1.
- **Effort**: A measure of how hard a character can push. At Tier 1, Effort is always 1. Applying one level of Effort to a task costs 3 pool points (from the relevant stat), reduced by Edge.

### 2.3 Character Creation Steps (the rules the app must implement)

**Step A — Choose Type**
The Type sets:
- Base stat pools (e.g., Glaive: Might 11, Speed 10, Intellect 7)
- Base Edge values (e.g., Glaive: Might 1, Speed 1, Intellect 0)
- Bonus pool points to distribute freely (e.g., Glaive gets 6 points)
- Starting Effort (always 1 at Tier 1)
- Cypher limit (how many cyphers can be carried)
- Weapon proficiency level
- Armor training
- A list of abilities to choose from (Fighting Moves for Glaive, Esoteries for Nano, Tricks of the Trade for Jack, etc.)
- Skill choices (e.g., Glaive: pick one of balancing, climbing, jumping, swimming)
- Inabilities (e.g., Glaive has inability in crafting numenera, salvaging numenera, understanding numenera)
- Starting equipment list
- Background options (flavor/narrative)

**Step B — Choose Descriptor**
The Descriptor modifies the character by adding:
- Pool modifiers (e.g., Tough: +1 Might, +1 to Armor)
- Trained skills (e.g., Charming: trained in persuasion)
- Inabilities (e.g., Swift: inability in balance tasks)
- Special abilities (some descriptors grant minor abilities)
- Additional equipment
- Initial Link to the Starting Adventure (narrative hooks — pick one from a list of 4)

**Step C — Choose Focus**
The Focus adds:
- Tier 1 ability (sometimes a choice between 2 options)
- Trained skills (some foci grant skills)
- Additional equipment
- Connection (a relationship hook with another PC)
- Abilities at Tiers 2-6 (stored in data, not used during Tier 1 character creation, but should be displayed for reference)

**Step D — Allocate Bonus Pool Points**
The Type grants a number of bonus points (typically 6). The user distributes these freely among Might, Speed, and Intellect pools. No pool can go below 1 after allocation (though this is unlikely to be violated since it adds to base pools).

Special case: **Jacks** also get 1 flex Edge point to allocate to any one stat's Edge.

**Step E — Choose Abilities**
Each Type has a specific ability category with a pick count:
- Glaive: Choose 2 Fighting Moves from ~6 options
- Nano: Choose 2 Esoteries from ~6 options  
- Jack: Choose 2 Tricks of the Trade from ~6 options (Jack's list may include options from Glaive or Nano lists)
- Arkus: Choose 2 Precepts
- Delve: Choose 2 Delve Lore abilities
- Wright: Choose 2 Wright abilities

**Step F — Choose Skills (where choices exist)**
Some Types require the user to pick a skill from a list. Example: Glaive picks one physical skill from [balancing, climbing, jumping, swimming]. This is separate from the trained skills automatically granted by Descriptor and Focus.

**Step G — Finalize**
Name the character, select a Background, choose connection hooks, review everything, generate the sheet.

### 2.4 Skill Resolution Rules (CRITICAL — the engine MUST implement these)

Skills in Numenera have three levels: **inability**, **untrained** (default), **trained**, **specialized**.

- **Inability**: Tasks of this kind are one step harder. Stacks with untrained (effectively two steps harder if also not trained).
- **Trained**: Tasks of this kind are one step easier.
- **Specialized**: Tasks of this kind are two steps easier. You become specialized by being trained in the same skill from two different sources.

**Conflict rules the engine must enforce:**

| Situation | Result |
|-----------|--------|
| Trained (from Type) + same skill Trained (from Descriptor or Focus) | → **Specialized** in that skill |
| Trained (from any source) + Inability (from any source) in the same skill | → They **cancel out**. Character is simply untrained (default). Remove from both trained and inability lists. |
| Inability (from Type) + Inability (from Descriptor) in the same general area | → Only listed once (inabilities don't stack to "double inability") |

### 2.5 Recovery Rolls

All Tier 1 characters have the same recovery mechanic:
- Recovery roll: 1d6 + Tier (so 1d6+1 at Tier 1)
- Four recovery checkboxes: 1 Action, 10 Minutes, 1 Hour, 10 Hours

This is static at Tier 1 and just needs to be printed on the sheet.

### 2.6 Damage Track

All characters have the same damage track: **Hale → Impaired → Debilitated → Dead**. This is static and just needs to be printed on the sheet.

---

<a id="3-tech-stack"></a>
## 3. TECH STACK (MANDATORY)

The agent MUST use these technologies. Do not substitute alternatives.

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | React | 18+ | Functional components + hooks only. No class components. |
| Language | TypeScript | 5+ | Strict mode enabled. All game data and state must be fully typed. |
| Styling | Tailwind CSS | 3+ | Utility-first. No separate CSS files except for PDF-specific styles if needed. |
| State | Zustand | Latest | Single store with slices for character state. Chosen over Context+useReducer for simplicity and devtools. |
| PDF | @react-pdf/renderer | Latest | Declarative PDF layout as React components. |
| Build | Vite | Latest | Default React-TS template. |
| Testing | Vitest | Latest | Unit + integration tests for the engine. |
| Package Manager | npm | — | — |

**No backend. No database. No authentication. No external API calls at runtime.**

---

<a id="4-project-structure"></a>
## 4. PROJECT STRUCTURE

The agent MUST create this exact directory structure. File names are mandatory. The agent may add additional files if needed but must not rename or reorganize these.

```
numenera-chargen/
├── public/
│   └── (static assets if needed)
├── src/
│   ├── data/                                # Static game data as typed JSON
│   │   ├── types/
│   │   │   ├── glaive.json
│   │   │   ├── nano.json
│   │   │   ├── jack.json
│   │   │   ├── arkus.json
│   │   │   ├── delve.json
│   │   │   └── wright.json
│   │   ├── descriptors/
│   │   │   ├── discovery.json              # Array of Descriptor objects
│   │   │   ├── destiny.json
│   │   │   ├── location-based.json
│   │   │   └── racial.json
│   │   ├── foci.json                        # Array of all Focus objects
│   │   └── index.ts                         # Re-exports all data with types
│   │
│   ├── types/                               # TypeScript interfaces (§5)
│   │   ├── CharacterType.ts
│   │   ├── Descriptor.ts
│   │   ├── Focus.ts
│   │   ├── Ability.ts
│   │   ├── Character.ts                     # The assembled character
│   │   └── index.ts                         # Re-exports all types
│   │
│   ├── engine/                              # Pure functions. No React. No side effects.
│   │   ├── poolCalculator.ts                # §7.1
│   │   ├── skillResolver.ts                 # §7.2
│   │   ├── equipmentResolver.ts             # §7.3
│   │   ├── characterAssembler.ts            # §7.4 — combines everything
│   │   ├── validationEngine.ts              # §7.5
│   │   └── __tests__/                       # Engine unit tests
│   │       ├── poolCalculator.test.ts
│   │       ├── skillResolver.test.ts
│   │       └── characterAssembler.test.ts
│   │
│   ├── store/                               # Zustand store
│   │   └── useCharacterStore.ts             # §8
│   │
│   ├── components/                          # React components
│   │   ├── wizard/
│   │   │   ├── WizardShell.tsx              # Step navigation, progress bar, layout
│   │   │   ├── StepType.tsx                 # Step 1: Choose Type
│   │   │   ├── StepDescriptor.tsx           # Step 2: Choose Descriptor
│   │   │   ├── StepFocus.tsx                # Step 3: Choose Focus
│   │   │   ├── StepAllocatePools.tsx        # Step 4: Distribute bonus points
│   │   │   ├── StepChooseAbilities.tsx      # Step 5: Pick abilities
│   │   │   ├── StepSkillsAndEquipment.tsx   # Step 6: Skills + equipment
│   │   │   └── StepReview.tsx               # Step 7: Review, name, generate
│   │   ├── common/
│   │   │   ├── StatPoolDisplay.tsx          # Shows Might/Speed/Intellect pools + edges
│   │   │   ├── SelectionCard.tsx            # Reusable card for picking Type/Descriptor/Focus
│   │   │   ├── AbilityCard.tsx              # Displays an ability with full description
│   │   │   └── SkillList.tsx                # Displays trained/specialized/inability lists
│   │   └── sheet/
│   │       └── CharacterSheetPDF.tsx        # @react-pdf/renderer document (§10)
│   │
│   ├── App.tsx                              # Root component — renders WizardShell
│   ├── main.tsx                             # Vite entry point
│   └── index.css                            # Tailwind imports
│
├── scripts/
│   └── scrape-srd.ts                        # One-time data extraction script (§6)
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── SPEC.md                                  # This file (copy of this spec)
```

**Key constraint**: The `engine/` directory contains **pure functions only**. No React imports, no hooks, no side effects. These functions take data in and return data out. This makes them independently testable.

---

<a id="5-data-model"></a>
## 5. DATA MODEL: TYPESCRIPT INTERFACES

The agent MUST define these exact interfaces. Field names, types, and optionality are mandatory. The agent may add additional helper types but must not modify these core interfaces.

### 5.1 Ability

```typescript
// src/types/Ability.ts

export interface Ability {
  id: string;                           // Unique kebab-case ID: "bash", "onslaught", "hedge-magic"
  name: string;                         // Display name: "Bash", "Onslaught", "Hedge Magic"
  description: string;                  // Full rules text from SRD
  cost?: {                              // Omit if no cost (passive/enabler abilities)
    pool: "might" | "speed" | "intellect";
    amount: number;
  };
  type: "action" | "enabler";          // "action" = costs a turn; "enabler" = passive/always-on
  tier: number;                         // Which tier this ability belongs to (1-6)
  source: string;                       // Which Type/Focus this comes from: "glaive", "nano", "bears-a-halo-of-fire", etc.
}
```

### 5.2 CharacterType

```typescript
// src/types/CharacterType.ts

import { Ability } from './Ability';

export interface SkillChoice {
  label: string;                        // UI label: "Physical Skill", "Knowledge Skill"
  pickCount: number;                    // How many the user must select
  options: string[];                    // Skill names to pick from (e.g., ["balancing", "climbing", "jumping", "swimming"])
  freeform: boolean;                    // If true, user can type a custom skill name instead of picking from options
}

export interface AbilityChoice {
  label: string;                        // "Fighting Moves", "Esoteries", "Tricks of the Trade", etc.
  pickCount: number;                    // How many to choose (typically 2)
  options: Ability[];                   // The abilities available at Tier 1
}

export interface Background {
  name: string;                         // "Intensive Training", "Inborn Traits", "Biomechanical Modification", etc.
  description: string;                  // Full description
}

export interface CharacterType {
  id: string;                           // "glaive", "nano", "jack", "arkus", "delve", "wright"
  name: string;                         // "Glaive", "Nano", etc.
  description: string;                  // Full prose description of the Type
  basePools: {
    might: number;
    speed: number;
    intellect: number;
  };
  bonusPoolPoints: number;              // Free points to distribute (e.g., 6 for Glaive)
  baseEdge: {
    might: number;
    speed: number;
    intellect: number;
  };
  flexEdge?: number;                    // ONLY for Jacks: 1 point of Edge to allocate freely. Omit for other types.
  effort: number;                       // Always 1 at Tier 1
  cypherLimit: number;                  // Typically 2 for Glaive, 3 for Nano, 2 for Jack, etc.
  weaponProficiency: "all" | "light-and-medium" | "light-only";
  trainedInArmor: boolean;              // If true, reduce Speed Effort penalty for armor by 1
  practiceWithAllWeapons: boolean;      // If true, no penalty for any weapon
  startingEquipment: string[];          // List of starting gear
  shins: number;                        // Starting currency
  backgrounds: Background[];
  abilityChoices: AbilityChoice[];      // Usually 1 AbilityChoice with pickCount=2
  skillChoices: SkillChoice[];          // Skill selections the user must make
  automaticSkills: string[];            // Skills automatically granted (trained) with no user choice
  inabilities: string[];                // Tasks the Type is bad at
  specialAbilities: Ability[];          // Abilities granted automatically (not chosen), e.g., "Combat Prowess", "Practiced With All Weapons"
}
```

### 5.3 Descriptor

```typescript
// src/types/Descriptor.ts

export interface Descriptor {
  id: string;                           // "charming", "tough", "graceful", etc.
  name: string;
  source: "discovery" | "destiny" | "location" | "racial";
  description: string;                  // Full prose description
  poolModifiers: {
    might?: number;                     // Additive. e.g., +2 means add 2 to Might pool
    speed?: number;
    intellect?: number;
  };
  edgeModifiers?: {
    might?: number;
    speed?: number;
    intellect?: number;
  };
  trainedSkills: string[];              // Skills automatically granted as trained
  inabilities: string[];                // Tasks hindered
  specialAbilities: {                   // Any unique abilities or traits the descriptor grants
    name: string;
    description: string;
  }[];
  additionalEquipment: string[];
  initialLinks: string[];               // 4 narrative hooks for how you joined the adventure (pick 1)
}
```

### 5.4 Focus

```typescript
// src/types/Focus.ts

import { Ability } from './Ability';

export interface Focus {
  id: string;                           // "bears-a-halo-of-fire", "wields-two-weapons", etc.
  name: string;                         // "Bears a Halo of Fire"
  description: string;                  // Full prose description
  connection: string;                   // PC connection text (e.g., "Choose another PC. Fire never harms them.")
  tier1: {
    grantedAbilities: Ability[];        // Abilities automatically granted at T1 (may be empty if choice below)
    abilityChoice?: {                   // Some foci let you choose between options at T1
      pickCount: number;
      options: Ability[];
    };
    trainedSkills: string[];            // Skills granted as trained
    additionalEquipment: string[];
  };
  higherTiers: {                        // Tiers 2-6 — stored for display, NOT used in character assembly
    tier: number;
    abilities: Ability[];
  }[];
}
```

### 5.5 Character (Assembled Output)

This is the final computed object after all selections are made. The PDF generator and Review step both consume this.

```typescript
// src/types/Character.ts

import { CharacterType } from './CharacterType';
import { Descriptor } from './Descriptor';
import { Focus } from './Focus';
import { Ability } from './Ability';

export interface CharacterPools {
  might: { pool: number; edge: number };
  speed: { pool: number; edge: number };
  intellect: { pool: number; edge: number };
}

export interface Character {
  // Identity
  name: string;
  sentence: string;                     // Computed: "I am a [Descriptor] [Type] who [Focus]."
  tier: 1;                              // Always 1 for this app
  effort: number;                       // Always 1

  // Source selections (references to the chosen data)
  typeId: string;
  descriptorId: string;
  focusId: string;

  // Computed stats
  pools: CharacterPools;
  cypherLimit: number;
  armorSpeedCostReduction: number;      // From Trained in Armor or similar

  // Skills (after conflict resolution — see §7.2)
  skills: {
    trained: string[];                  // Skills at trained level
    specialized: string[];             // Skills at specialized level (trained from 2 sources)
    inabilities: string[];             // Remaining inabilities after cancellation
  };

  // Abilities
  abilities: Ability[];                 // All abilities: automatic from Type + chosen + from Focus

  // Equipment
  equipment: string[];                  // All non-weapon, non-armor items
  weapons: string[];
  armor: string;                        // e.g., "light armor", "medium armor", "none"
  shins: number;
  cyphers: string[];                    // Empty strings — placeholders for GM to fill

  // Narrative
  background: string;                   // Chosen background name
  initialLink: string;                  // Chosen initial link from Descriptor
  connection: string;                   // Connection from Focus
  notes: string;                        // Free-text user notes

  // Recovery (static at Tier 1)
  recoveryRollBonus: number;            // Always 1 at Tier 1
}
```

---

<a id="6-game-data"></a>
## 6. GAME DATA: SOURCE, EXTRACTION, AND FORMAT

### 6.1 Data Source

All game data comes from the Numenera 2E SRD at: **http://numenera2e.wikidot.com/**

Key pages to scrape:

| URL Path | Content |
|----------|---------|
| `/character-creation` | Overview rules, pool allocation rules |
| `/glaive` | Glaive Type: full stats, abilities, equipment, backgrounds |
| `/nano` | Nano Type: full stats, esoteries, equipment, backgrounds |
| `/jack` | Jack Type: full stats, tricks, flex edge rule, backgrounds |
| `/arkus` | Arkus Type: stats, precepts, backgrounds |
| `/delve` | Delve Type: stats, delve lore, backgrounds |
| `/wright` | Wright Type: stats, wright abilities, backgrounds |
| `/descriptors` | Lists all Discovery descriptors with full details |
| `/destiny-descriptors` | Lists all Destiny descriptors with full details |
| `/location-descriptors` | Location-based descriptors |
| `/racial-options` | Racial descriptors (Diruk, Golthiar, Mlox, Nalurus, Varjellen, Lattimor, Mutant) |
| `/foci` | Lists all Foci |
| `/foci/[focus-name]` | Individual focus detail pages |

### 6.2 Extraction Script

The agent SHOULD build `scripts/scrape-srd.ts` as a one-time Node.js script using `axios` + `cheerio` to:

1. Fetch each page listed above.
2. Parse the HTML (Wikidot pages use `<div id="page-content">` for main content).
3. Extract structured fields matching the TypeScript interfaces in §5.
4. Write output as JSON files into `src/data/`.

**If the SRD site is unreachable** (it uses Wikidot which may have connectivity issues), the agent should:
1. Create the JSON data files manually using the game knowledge provided in §2 of this spec.
2. Start with the 3 core Types (Glaive, Nano, Jack), 5 Discovery Descriptors (Charming, Clever, Graceful, Learned, Tough), and 5 Foci (Bears a Halo of Fire, Controls Beasts, Crafts Illusions, Explores Dark Places, Wields Two Weapons) as seed data.
3. Structure the JSON so additional entries can be added later by simply appending to the arrays.

### 6.3 Data File Format

Each JSON file must be an array of objects matching the TypeScript interfaces. Example for `src/data/types/glaive.json`:

```json
{
  "id": "glaive",
  "name": "Glaive",
  "description": "Glaives are the elite warriors of the Ninth World...",
  "basePools": { "might": 11, "speed": 10, "intellect": 7 },
  "bonusPoolPoints": 6,
  "baseEdge": { "might": 1, "speed": 1, "intellect": 0 },
  "effort": 1,
  "cypherLimit": 2,
  "weaponProficiency": "all",
  "trainedInArmor": true,
  "practiceWithAllWeapons": true,
  "startingEquipment": ["clothing", "two weapons (or one weapon and a shield)", "light or medium armor", "explorer's pack", "4 shins"],
  "shins": 4,
  "backgrounds": [
    { "name": "Intensive Training", "description": "..." },
    { "name": "Inborn Traits", "description": "..." },
    { "name": "Biomechanical Modification", "description": "..." }
  ],
  "abilityChoices": [{
    "label": "Fighting Moves",
    "pickCount": 2,
    "options": [
      { "id": "bash", "name": "Bash", "description": "...", "cost": { "pool": "might", "amount": 1 }, "type": "action", "tier": 1, "source": "glaive" },
      "..."
    ]
  }],
  "skillChoices": [{
    "label": "Physical Skill",
    "pickCount": 1,
    "options": ["balancing", "climbing", "jumping", "swimming"],
    "freeform": false
  }],
  "automaticSkills": [],
  "inabilities": ["crafting numenera", "salvaging numenera", "understanding numenera"],
  "specialAbilities": [
    { "id": "combat-prowess", "name": "Combat Prowess", "description": "You add +1 damage to one type of attack of your choice: melee or ranged.", "type": "enabler", "tier": 1, "source": "glaive" },
    { "id": "trained-in-armor", "name": "Trained in Armor", "description": "You reduce the Speed Effort cost for wearing armor by 1.", "type": "enabler", "tier": 1, "source": "glaive" }
  ]
}
```

### 6.4 Data Index (`src/data/index.ts`)

This file re-exports all data with proper typing so components can import from a single location:

```typescript
import glaive from './types/glaive.json';
import nano from './types/nano.json';
// ... etc.
import discoveryDescriptors from './descriptors/discovery.json';
// ... etc.
import foci from './foci.json';

import type { CharacterType } from '../types/CharacterType';
import type { Descriptor } from '../types/Descriptor';
import type { Focus } from '../types/Focus';

export const allTypes: CharacterType[] = [glaive, nano, jack, arkus, delve, wright] as CharacterType[];
export const allDescriptors: Descriptor[] = [
  ...discoveryDescriptors,
  ...destinyDescriptors,
  ...locationDescriptors,
  ...racialDescriptors,
] as Descriptor[];
export const allFoci: Focus[] = foci as Focus[];

// Lookup helpers
export const getTypeById = (id: string): CharacterType | undefined => allTypes.find(t => t.id === id);
export const getDescriptorById = (id: string): Descriptor | undefined => allDescriptors.find(d => d.id === id);
export const getFocusById = (id: string): Focus | undefined => allFoci.find(f => f.id === id);
```

---

<a id="7-engine-logic"></a>
## 7. ENGINE LOGIC: CHARACTER ASSEMBLY RULES

All functions in `src/engine/` are **pure functions**. No React. No hooks. No state mutation. They take inputs and return outputs.

### 7.1 Pool Calculator (`poolCalculator.ts`)

```typescript
/**
 * Computes final stat pools and edge values.
 *
 * FORMULA:
 *   pool.might = type.basePools.might + descriptor.poolModifiers.might + userBonusAllocation.might
 *   pool.speed = type.basePools.speed + descriptor.poolModifiers.speed + userBonusAllocation.speed
 *   pool.intellect = type.basePools.intellect + descriptor.poolModifiers.intellect + userBonusAllocation.intellect
 *
 *   edge.might = type.baseEdge.might + (descriptor.edgeModifiers?.might ?? 0) + (focus.tier1EdgeBonus?.might ?? 0) + (jackFlexEdge === "might" ? 1 : 0)
 *   edge.speed = type.baseEdge.speed + (descriptor.edgeModifiers?.speed ?? 0) + (focus.tier1EdgeBonus?.speed ?? 0) + (jackFlexEdge === "speed" ? 1 : 0)
 *   edge.intellect = type.baseEdge.intellect + (descriptor.edgeModifiers?.intellect ?? 0) + (focus.tier1EdgeBonus?.intellect ?? 0) + (jackFlexEdge === "intellect" ? 1 : 0)
 *
 * VALIDATION:
 *   - userBonusAllocation.might + .speed + .intellect MUST equal type.bonusPoolPoints exactly
 *   - Each allocation value must be >= 0
 *   - jackFlexEdge is only allowed when type.flexEdge is defined (i.e., type is Jack)
 *
 * RETURNS: CharacterPools object + list of validation errors (empty if valid)
 */
```

### 7.2 Skill Resolver (`skillResolver.ts`)

```typescript
/**
 * Merges skills from Type (user-chosen + automatic), Descriptor, and Focus.
 * Applies conflict resolution rules from §2.4.
 *
 * INPUT:
 *   - typeAutoSkills: string[]         — from type.automaticSkills
 *   - typeChosenSkills: string[]       — user's picks from type.skillChoices
 *   - descriptorSkills: string[]       — from descriptor.trainedSkills
 *   - focusSkills: string[]            — from focus.tier1.trainedSkills
 *   - typeInabilities: string[]        — from type.inabilities
 *   - descriptorInabilities: string[]  — from descriptor.inabilities
 *
 * ALGORITHM:
 *   1. Collect all trained skills into a list, noting their source.
 *   2. Collect all inabilities into a list.
 *   3. For each skill that appears in BOTH trained and inabilities:
 *      - Remove from both lists (they cancel out).
 *      - Record the cancellation in a "notes" array for the UI to display.
 *   4. For each skill that appears TWICE in trained (from different sources):
 *      - Remove from trained list.
 *      - Add to specialized list.
 *   5. Deduplicate remaining inabilities.
 *
 * RETURNS: { trained: string[], specialized: string[], inabilities: string[], cancellations: string[] }
 */
```

### 7.3 Equipment Resolver (`equipmentResolver.ts`)

```typescript
/**
 * Aggregates equipment from Type, Descriptor, and Focus.
 *
 * FORMULA:
 *   allEquipment = type.startingEquipment + descriptor.additionalEquipment + focus.tier1.additionalEquipment
 *
 * The function separates equipment into categories:
 *   - weapons: string[]
 *   - armor: string
 *   - generalEquipment: string[]
 *   - shins: number (sum from all sources)
 *
 * Weapon/armor classification is based on keyword matching:
 *   - Contains "sword", "axe", "mace", "bow", "dagger", "weapon", etc. → weapon
 *   - Contains "armor", "shield" → armor
 *   - Contains "shin" → parse number and add to shins
 *   - Everything else → general equipment
 *
 * RETURNS: { weapons: string[], armor: string, equipment: string[], shins: number }
 */
```

### 7.4 Character Assembler (`characterAssembler.ts`)

```typescript
/**
 * The master function. Takes all user selections and produces a final Character object.
 *
 * INPUTS:
 *   - typeId: string
 *   - descriptorId: string
 *   - focusId: string
 *   - bonusPoolAllocation: { might: number, speed: number, intellect: number }
 *   - jackFlexEdge?: "might" | "speed" | "intellect"  (only if type is Jack)
 *   - chosenAbilityIds: string[]
 *   - chosenSkills: string[]  (from type.skillChoices)
 *   - backgroundName: string
 *   - initialLink: string
 *   - characterName: string
 *   - notes: string
 *
 * STEPS:
 *   1. Look up Type, Descriptor, Focus from data index.
 *   2. Call poolCalculator → get pools and edge.
 *   3. Call skillResolver → get trained, specialized, inabilities.
 *   4. Call equipmentResolver → get equipment, weapons, armor, shins.
 *   5. Collect abilities: type.specialAbilities + chosen abilities from type.abilityChoices + focus.tier1.grantedAbilities + focus.tier1.abilityChoice (if applicable).
 *   6. Build the sentence: "I am a [Descriptor.name] [Type.name] who [Focus.name]."
 *   7. Construct and return the Character object.
 *
 * RETURNS: Character
 */
```

### 7.5 Validation Engine (`validationEngine.ts`)

```typescript
/**
 * Validates that all required selections have been made before generating the sheet.
 *
 * CHECKS:
 *   1. typeId is set and exists in data.
 *   2. descriptorId is set and exists in data.
 *   3. focusId is set and exists in data.
 *   4. bonusPoolAllocation values are all >= 0 and sum to type.bonusPoolPoints.
 *   5. If type is Jack, jackFlexEdge must be set to one of "might", "speed", "intellect".
 *   6. chosenAbilityIds length matches type.abilityChoices[0].pickCount.
 *   7. All chosenAbilityIds exist in the type's ability options.
 *   8. chosenSkills length matches sum of all type.skillChoices[*].pickCount.
 *   9. characterName is non-empty after trimming.
 *
 * RETURNS: { valid: boolean, errors: string[] }
 *   Each error is a human-readable string like: "You must allocate all 6 bonus pool points (currently allocated: 4)"
 */
```

---

<a id="8-state-management"></a>
## 8. STATE MANAGEMENT

Use Zustand. Single store. The store holds the user's in-progress selections and exposes actions to modify them.

```typescript
// src/store/useCharacterStore.ts

interface CharacterStore {
  // Current step (0-indexed)
  currentStep: number;
  setStep: (step: number) => void;

  // Selections
  typeId: string | null;
  descriptorId: string | null;
  focusId: string | null;
  bonusAllocation: { might: number; speed: number; intellect: number };
  jackFlexEdge: "might" | "speed" | "intellect" | null;
  chosenAbilityIds: string[];
  chosenSkills: string[];
  backgroundName: string;
  initialLink: string;
  connection: string;
  characterName: string;
  notes: string;

  // Actions
  selectType: (id: string) => void;          // Also resets downstream: abilities, skills
  selectDescriptor: (id: string) => void;
  selectFocus: (id: string) => void;
  setBonusAllocation: (allocation: { might: number; speed: number; intellect: number }) => void;
  setJackFlexEdge: (stat: "might" | "speed" | "intellect") => void;
  toggleAbility: (id: string) => void;       // Add/remove from chosenAbilityIds
  setChosenSkills: (skills: string[]) => void;
  setBackground: (name: string) => void;
  setInitialLink: (link: string) => void;
  setConnection: (connection: string) => void;
  setCharacterName: (name: string) => void;
  setNotes: (notes: string) => void;

  // Cascading reset rules (CRITICAL — implement these exactly):
  // - selectType() → also resets: chosenAbilityIds, chosenSkills, bonusAllocation, jackFlexEdge
  // - selectDescriptor() → no downstream resets needed
  // - selectFocus() → no downstream resets needed

  // Computed (call engine functions)
  getAssembledCharacter: () => Character | null;  // Returns null if validation fails
  getValidationErrors: () => string[];
}
```

**localStorage persistence**: On every store change, serialize the store to `localStorage` under the key `"numenera-chargen-state"`. On app load, hydrate from localStorage if present. Use Zustand's `persist` middleware.

---

<a id="9-ui-specification"></a>
## 9. UI SPECIFICATION: WIZARD STEPS

### 9.1 Overall Layout

The app is a single-page wizard. The layout has three zones:

```
┌────────────────────────────────────────────────────────────┐
│  HEADER BAR                                                │
│  Sentence: "I am a [____] [____] who [____]"               │
│  (blanks fill in as selections are made; use placeholder    │
│   text like "..." for unselected parts)                    │
├──────────────┬─────────────────────────────────────────────┤
│  LEFT SIDEBAR│  MAIN CONTENT AREA                          │
│  (240px)     │  (remaining width)                          │
│              │                                             │
│  Progress:   │  Renders the current step component.        │
│  ● Step 1    │                                             │
│  ○ Step 2    │                                             │
│  ○ Step 3    │                                             │
│  ○ Step 4    │                                             │
│  ○ Step 5    │                                             │
│  ○ Step 6    │                                             │
│  ○ Step 7    │                                             │
│              │                                             │
│  ─────────── │                                             │
│  LIVE STATS  │                                             │
│  Might: 11   │                                             │
│    Edge: 1   │                                             │
│  Speed: 10   │                                             │
│    Edge: 1   │                                             │
│  Int:   7    │                                             │
│    Edge: 0   │                                             │
│              │                                             │
│  Effort: 1   │                                             │
├──────────────┴─────────────────────────────────────────────┤
│  FOOTER: [← Back]                          [Next Step →]   │
│  (Back is disabled on Step 1;                              │
│   Next is disabled until current step's required           │
│   selections are made;                                     │
│   On Step 7, "Next" becomes "Download Character Sheet")    │
└────────────────────────────────────────────────────────────┘
```

**Live Stats in sidebar**: These update in real-time as the user makes selections. After Step 1 (Type selected), show base pools. After Step 2 (Descriptor), show modified pools. After Step 4 (allocation), show final pools. The stats always reflect the current computed state, calling the engine's poolCalculator.

### 9.2 Step Components — Behavior Specifications

#### Step 1: StepType

- Display 6 cards in a 2×3 or 3×2 grid.
- Each card shows: Type name, one-line tagline, base pools (M/S/I numbers).
- Clicking a card highlights it as selected.
- Below the grid, show an expanded detail panel for the selected Type: full description, starting equipment, backgrounds, ability names.
- **Required selection to proceed**: One Type must be selected.

#### Step 2: StepDescriptor

- Display descriptors grouped under collapsible section headers: "Discovery", "Destiny", "Location-Based", "Racial".
- Each descriptor shows: name, pool modifiers as colored badges (e.g., "+2 Might"), trained skills, inabilities.
- Clicking a descriptor selects it and expands its full description below.
- If a descriptor's trained skill conflicts with the Type's inability, show a note: "Note: [skill] training from [Descriptor] cancels your [Type] inability in [skill]."
- **Required selection to proceed**: One Descriptor must be selected.

#### Step 3: StepFocus

- Display all foci in a single scrollable list with a search/filter text input at the top.
- Each focus card shows: name, T1 ability name, granted skills (if any).
- On selection, show: full description, T1 ability full text, connection hook, higher tier abilities (collapsed, for reference).
- **Required selection to proceed**: One Focus must be selected.

#### Step 4: StepAllocatePools

- Show three stat columns: Might, Speed, Intellect.
- For each, show: the current computed pool value (base + descriptor modifier + user allocation) and +/- buttons.
- Show remaining unallocated points prominently: "Points remaining: X of Y"
- If the selected Type is Jack, also show: "Flex Edge: Allocate 1 Edge point to:" with three radio buttons (Might/Speed/Intellect).
- +/- buttons enforce: allocation per stat >= 0, total allocation = bonusPoolPoints.
- **Required to proceed**: All bonus points allocated. If Jack, flex Edge must be assigned.

#### Step 5: StepChooseAbilities

- Show the Type's ability choice label (e.g., "Choose 2 Fighting Moves").
- Display each ability option as a card with: name, cost (if any), type (action/enabler), full description.
- Each card has a checkbox/toggle. Enforce max selections = pickCount.
- If the Focus also grants a choice at T1, show that as a separate section: "Focus Ability: Choose 1 of the following..."
- **Required to proceed**: Correct number of abilities selected for each choice group.

#### Step 6: StepSkillsAndEquipment

- **Skills section**: For each entry in type.skillChoices, show a dropdown/radio group of the options. If freeform is true, show a text input alongside the options.
- Show a read-only summary of all skills that will be on the sheet (from Type auto, Descriptor, Focus, plus user picks here), with conflict resolution notes.
- **Equipment section**: Show the combined equipment list (read-only). If the Type allows weapon choice (e.g., "two weapons"), show dropdowns for weapon selection (light/medium/heavy with names). If armor choice exists, show armor selection.
- **Required to proceed**: All skill choices made. Weapon selections made (if applicable).

#### Step 7: StepReview

- Full read-only summary of the entire character.
- Text input for character name (required).
- Dropdown for background selection (from type.backgrounds).
- Dropdown for initial link selection (from descriptor.initialLinks).
- Display connection from Focus (read-only).
- Text area for notes (optional).
- Show validation errors (if any) as a red banner at top.
- "Download Character Sheet" button (disabled if validation errors exist). On click, generate and download PDF.

### 9.3 Visual Design Direction

- Dark fantasy aesthetic appropriate for Numenera's weird science-fantasy setting.
- Dark background (slate-900 or similar), light text.
- Accent color: teal or cyan (evokes numenera technology glow).
- Cards: dark surface with subtle border, hover glow effect.
- Selected cards: highlighted border in accent color.
- Font: system sans-serif for UI; consider a display font for the character sentence header.
- The overall feel should be atmospheric but not distracting — the content is dense and needs to be readable.

---

<a id="10-pdf-generation"></a>
## 10. PDF CHARACTER SHEET GENERATION

### 10.1 Technology

Use `@react-pdf/renderer`. The PDF document is defined as a React component in `src/components/sheet/CharacterSheetPDF.tsx`.

### 10.2 Sheet Layout (US Letter, Portrait)

The PDF is a single page (or two if content overflows) with these sections in order:

```
┌─────────────────────────────────────────────────────┐
│  CHARACTER NAME (large, bold)    Tier: 1  Effort: 1 │
│  "I am a [Descriptor] [Type] who [Focus]."          │
│  Background: [name]              XP: 0              │
├─────────────────────────────────────────────────────┤
│        MIGHT        │      SPEED       │  INTELLECT │
│  Pool: ___  Edge: _ │ Pool: __ Edge: _ │ Pool: __ E:│
├─────────────────────┴──────────────────┴────────────┤
│  RECOVERY: □ 1 Action □ 10 Min □ 1 Hr □ 10 Hr      │
│  Recovery Roll: 1d6 + 1                             │
│  Damage Track: □ Impaired  □ Debilitated            │
├─────────────────────────────────────────────────────┤
│  TRAINED SKILLS          │  SPECIALIZED SKILLS      │
│  • [skill]               │  • [skill]               │
│  • [skill]               │                          │
│                          │  INABILITIES             │
│                          │  • [inability]            │
├──────────────────────────┴──────────────────────────┤
│  SPECIAL ABILITIES                                  │
│  • [Ability Name]: [full description]               │
│  • [Ability Name]: [full description]               │
│  • [Ability Name]: [full description]               │
├─────────────────────────────────────────────────────┤
│  ATTACKS                                            │
│  Name        │ Skill │ Damage │ Range │ Notes       │
│  [weapon]    │ T/S/— │ #      │ Imm/S │             │
├─────────────────────────────────────────────────────┤
│  EQUIPMENT                │  CYPHERS (Limit: #)     │
│  • [item]                 │  1. ________________    │
│  • [item]                 │  2. ________________    │
│  Shins: [#]               │                         │
├───────────────────────────┴─────────────────────────┤
│  CONNECTION: [focus connection text]                 │
│  INITIAL LINK: [chosen link text]                   │
│  NOTES: [user notes]                                │
├─────────────────────────────────────────────────────┤
│  Numenera is a product of Monte Cook Games, LLC.    │
│  Character generated with Numenera Character Sheet  │
│  Generator.                                         │
└─────────────────────────────────────────────────────┘
```

### 10.3 PDF Component Contract

```typescript
// src/components/sheet/CharacterSheetPDF.tsx
// Props: { character: Character }
// Renders a @react-pdf/renderer <Document> with the layout above.
// Export a function generatePDF(character: Character): Promise<Blob> that renders to blob for download.
```

### 10.4 Download Trigger

In StepReview, the "Download Character Sheet" button calls:
1. `store.getAssembledCharacter()` → get the Character object.
2. `generatePDF(character)` → get a Blob.
3. Create a download link: `URL.createObjectURL(blob)` with filename `[characterName]-character-sheet.pdf`.

---

<a id="11-acceptance-criteria"></a>
## 11. ACCEPTANCE CRITERIA

The project is complete when ALL of the following are true:

1. **App loads** with no console errors in a browser via `npm run dev`.
2. **All 7 wizard steps** render and are navigable via Back/Next buttons.
3. **Type selection** (Step 1) shows at minimum Glaive, Nano, and Jack with correct base stats.
4. **Descriptor selection** (Step 2) shows at minimum 5 descriptors with correct pool modifiers and skills.
5. **Focus selection** (Step 3) shows at minimum 5 foci with correct T1 abilities and skills.
6. **Pool allocation** (Step 4) enforces: all points must be allocated, cannot go negative, Jack flex edge works.
7. **Ability selection** (Step 5) enforces correct pick count for the chosen Type.
8. **Skill resolution** correctly handles: trained + inability cancellation, trained + trained → specialized.
9. **Review step** (Step 7) shows the complete character with the sentence "I am a [X] [Y] who [Z]."
10. **PDF downloads** successfully and contains all character data, readable and correctly laid out.
11. **State persists** across page refresh via localStorage.
12. **Changing Type** resets downstream selections (abilities, skills, pool allocation).
13. **Changing Descriptor or Focus** does NOT reset unrelated selections.
14. **All engine functions** have passing unit tests.

---

<a id="12-implementation-order"></a>
## 12. IMPLEMENTATION ORDER

The agent MUST implement in this order. Each phase builds on the previous and should be functional before proceeding.

### Phase 1: Scaffold + Data + Types
1. Initialize Vite + React + TypeScript project.
2. Install dependencies: `zustand`, `@react-pdf/renderer`, `tailwindcss`.
3. Create all TypeScript interfaces from §5.
4. Create seed data JSON files (minimum: Glaive, Nano, Jack; 5 Descriptors; 5 Foci).
5. Create `src/data/index.ts` with lookup helpers.
6. **Verify**: interfaces compile, data imports work.

### Phase 2: Engine (Pure Functions)
1. Implement `poolCalculator.ts` with the exact formula from §7.1.
2. Implement `skillResolver.ts` with the conflict resolution from §7.2.
3. Implement `equipmentResolver.ts` from §7.3.
4. Implement `characterAssembler.ts` from §7.4.
5. Implement `validationEngine.ts` from §7.5.
6. Write unit tests for all engine functions.
7. **Verify**: all tests pass. Run a golden path test (§15) programmatically.

### Phase 3: Store
1. Implement `useCharacterStore.ts` with Zustand + persist middleware.
2. Implement all actions including cascading resets.
3. **Verify**: store actions work correctly in isolation.

### Phase 4: Wizard UI
1. Build `WizardShell.tsx` with step navigation, progress sidebar, live stats, Back/Next buttons.
2. Build Steps 1-7 in order, each wired to the store.
3. **Verify**: can navigate through all steps, make selections, see live stats update.

### Phase 5: PDF Generation
1. Build `CharacterSheetPDF.tsx` with the layout from §10.2.
2. Wire the download button in StepReview.
3. **Verify**: PDF downloads and opens correctly with all data populated.

### Phase 6: Polish
1. Apply dark fantasy visual styling (§9.3).
2. Add search/filter to Focus step.
3. Add collapsible groups to Descriptor step.
4. Test cascading resets (change Type mid-flow, verify downstream resets).
5. Test localStorage persistence (refresh mid-flow, verify state restored).

---

<a id="13-edge-cases"></a>
## 13. KNOWN EDGE CASES

The agent MUST handle these specifically:

| # | Edge Case | Expected Behavior |
|---|-----------|-------------------|
| 1 | **Jack flex Edge**: Jack is the only Type with a flex Edge point. | Show Edge allocation UI only when Type is Jack. Hide it for all other Types. |
| 2 | **Racial descriptors** (Diruk, Golthiar, etc.) have more complex structures with multiple mutations/traits. | Model extra traits as entries in `specialAbilities[]`. The Descriptor interface supports this. |
| 3 | **Focus T1 choice**: Some foci let you choose between two T1 abilities instead of granting one automatically. | If `focus.tier1.abilityChoice` is defined, show a choice UI in Step 5 alongside the Type ability choices. |
| 4 | **Skill cancellation**: Swift Descriptor gives inability in balance → Glaive can choose balancing as trained skill → they cancel. | skillResolver must detect this and remove both, adding to cancellations list. UI should show a note. |
| 5 | **Skill specialization**: Descriptor grants "trained in perception" + Focus grants "trained in perception". | skillResolver promotes to specialized. Show as specialized on sheet. |
| 6 | **Empty ability cost**: Enabler abilities have no cost. | `cost` field is optional. If omitted, display as "Enabler" with no cost in the UI and sheet. |
| 7 | **Descriptor with negative pool modifier**: Some descriptors subtract from a pool. | poolModifiers values can be negative. The pool calculator handles this naturally via addition. Ensure no pool drops below 1 after all modifications. |
| 8 | **Multiple skill choices**: Some Types have more than one skillChoice entry. | Step 6 must render a UI group for EACH entry in `type.skillChoices[]`, not just the first. |
| 9 | **Wright/Delve/Arkus data may be unavailable**: If the scraper can't get these Types. | App must work with partial data. If only 3 Types have data, only show those 3 in Step 1. |

---

<a id="14-testing-requirements"></a>
## 14. TESTING REQUIREMENTS

### 14.1 Unit Tests (Required)

Tests MUST exist for all engine functions in `src/engine/__tests__/`:

**poolCalculator.test.ts:**
- Test Glaive base pools compute correctly.
- Test Descriptor modifier applies (positive and negative).
- Test bonus allocation distributes correctly.
- Test validation rejects allocation that doesn't sum to bonusPoolPoints.
- Test Jack flex Edge applies to correct stat.
- Test non-Jack with flexEdge set is rejected.

**skillResolver.test.ts:**
- Test simple merge (no conflicts).
- Test trained + inability cancellation.
- Test trained + trained → specialized promotion.
- Test multiple cancellations in one character.
- Test deduplication of inabilities.

**characterAssembler.test.ts:**
- Test full golden path from §15.
- Test that assembled Character matches expected output for a known Type + Descriptor + Focus combination.

### 14.2 Data Integrity (Recommended)

A script or test that validates:
- Every JSON data file parses without error.
- Every ability referenced in a Type's abilityChoices has all required fields.
- Every Descriptor has at least 1 initialLink.
- Every Focus has at least 1 tier1 granted ability or ability choice.

---

<a id="15-golden-path"></a>
## 15. REFERENCE: EXAMPLE CHARACTER BUILD (GOLDEN PATH TEST)

Use this specific character to validate the engine end-to-end.

**Selections:**
- Type: **Glaive**
- Descriptor: **Tough**
- Focus: **Explores Dark Places**
- Bonus Pool Allocation: Might +3, Speed +2, Intellect +1
- Fighting Moves chosen: **Bash**, **No Need for Weapons**
- Physical Skill chosen: **climbing**
- Background: **Intensive Training**
- Character Name: **Kael**

**Expected Computed Character:**

```
Name: Kael
Sentence: "I am a Tough Glaive who Explores Dark Places."
Tier: 1, Effort: 1

Pools:
  Might:     11 (base) + 1 (Tough) + 3 (allocation) = 15, Edge: 1 (Glaive base)
  Speed:     10 (base) + 0 (Tough) + 2 (allocation) = 12, Edge: 1 (Glaive base)
  Intellect:  7 (base) + 0 (Tough) + 1 (allocation) =  8, Edge: 0 (Glaive base)

Skills:
  Trained: climbing (from Glaive skill choice), searching (from Explores Dark Places), listening (from Explores Dark Places), climbing (from Explores Dark Places), jumping (from Explores Dark Places), balancing (from Explores Dark Places)
  
  NOTE: "climbing" appears from BOTH Glaive skill choice AND Explores Dark Places
        → Promote to SPECIALIZED
  
  After resolution:
    Specialized: climbing
    Trained: searching, listening, jumping, balancing, intimidation (from Tough)
    Inabilities: crafting numenera, salvaging numenera, understanding numenera (from Glaive)

  (Tough also grants: +1 Armor, trained in Might defense tasks, inability in initiative and charm/persuasion tasks.
   These should also appear if modeled in the Descriptor data.)

Abilities:
  - Combat Prowess (automatic, Glaive)
  - Trained in Armor (automatic, Glaive)
  - Practiced With All Weapons (automatic, Glaive)
  - Bash (chosen Fighting Move)
  - No Need for Weapons (chosen Fighting Move)
  - [Explores Dark Places T1 ability — e.g., "Trained Explorer" or similar]

Equipment:
  Clothing, two weapons, light or medium armor, explorer's pack (with extra exploring gear from Focus), pack of light tools
  Shins: 4 + any from Tough/Focus

Cypher Limit: 2
```

**The agent should create a unit test in `characterAssembler.test.ts` that asserts the above outputs for these inputs.** Minor details (exact ability names from Focus, exact Tough modifiers) depend on the scraped data, but the test structure should match this pattern.

---

## END OF SPECIFICATION

This document is the complete specification. The agent should:
1. Read this document in full before writing any code.
2. Follow the implementation order in §12 strictly.
3. When uncertain about a game rule, refer to §2.
4. When uncertain about a data structure, refer to §5.
5. When uncertain about engine behavior, refer to §7.
6. Test against the golden path in §15.
7. If anything is genuinely ambiguous, ask rather than assume.
