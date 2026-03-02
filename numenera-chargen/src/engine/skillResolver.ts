export interface SkillResolverInput {
  typeAutoSkills: string[];
  typeChosenSkills: string[];
  descriptorSkills: string[];
  focusSkills: string[];
  typeInabilities: string[];
  descriptorInabilities: string[];
}

export interface SkillResolverResult {
  trained: string[];
  specialized: string[];
  inabilities: string[];
  cancellations: string[];
}

function normalize(skill: string): string {
  return skill.trim().toLowerCase();
}

export function resolveSkills(input: SkillResolverInput): SkillResolverResult {
  const {
    typeAutoSkills,
    typeChosenSkills,
    descriptorSkills,
    focusSkills,
    typeInabilities,
    descriptorInabilities,
  } = input;

  // Step 1: Collect all trained skills with their sources
  const trainedEntries: { skill: string; source: string }[] = [];
  for (const s of typeAutoSkills) trainedEntries.push({ skill: normalize(s), source: 'type' });
  for (const s of typeChosenSkills) trainedEntries.push({ skill: normalize(s), source: 'type' });
  for (const s of descriptorSkills) trainedEntries.push({ skill: normalize(s), source: 'descriptor' });
  for (const s of focusSkills) trainedEntries.push({ skill: normalize(s), source: 'focus' });

  // Step 2: Collect all inabilities
  const inabilityEntries: string[] = [
    ...typeInabilities.map(normalize),
    ...descriptorInabilities.map(normalize),
  ];

  const cancellations: string[] = [];
  const specialized: string[] = [];

  // Step 3: Cancel trained + inability conflicts
  const remainingTrained: { skill: string; source: string }[] = [];
  const remainingInabilities: string[] = [];

  // Build a set of trained skill names for quick lookup
  const trainedSkillNames = new Set(trainedEntries.map(e => e.skill));

  for (const inability of inabilityEntries) {
    if (trainedSkillNames.has(inability)) {
      cancellations.push(
        `Training in "${inability}" cancels out inability in "${inability}"`
      );
      // Remove the trained entry that matches
      const idx = trainedEntries.findIndex(e => e.skill === inability);
      if (idx !== -1) {
        trainedEntries.splice(idx, 1);
        trainedSkillNames.delete(inability);
      }
    } else {
      remainingInabilities.push(inability);
    }
  }

  // Remaining trained entries (after cancellations)
  remainingTrained.push(...trainedEntries);

  // Step 4: Check for specialization (same skill from different sources)
  const skillSourceMap = new Map<string, Set<string>>();
  for (const entry of remainingTrained) {
    if (!skillSourceMap.has(entry.skill)) {
      skillSourceMap.set(entry.skill, new Set());
    }
    skillSourceMap.get(entry.skill)!.add(entry.source);
  }

  const finalTrained: string[] = [];
  for (const [skill, sources] of skillSourceMap) {
    if (sources.size >= 2) {
      specialized.push(skill);
    } else {
      finalTrained.push(skill);
    }
  }

  // Step 5: Deduplicate inabilities
  const uniqueInabilities = [...new Set(remainingInabilities)];

  return {
    trained: finalTrained,
    specialized,
    inabilities: uniqueInabilities,
    cancellations,
  };
}
