import { describe, it, expect } from 'vitest';
import { assembleCharacter } from '../characterAssembler';

describe('characterAssembler', () => {
  it('assembles Kael — Tough Glaive who Explores Dark Places (golden path)', () => {
    const character = assembleCharacter({
      typeId: 'glaive',
      descriptorId: 'tough',
      focusId: 'explores-dark-places',
      bonusAllocation: { might: 3, speed: 2, intellect: 1 },
      chosenAbilityIds: ['bash', 'no-need-for-weapons'],
      chosenSkills: ['climbing'],
      backgroundName: 'Intensive Training',
      initialLink: "You're acting as a bodyguard for one of the other PCs.",
      connection: 'Pick one other PC. This character once saved your life underground.',
      characterName: 'Kael',
      notes: '',
    });

    expect(character).not.toBeNull();
    if (!character) return;

    // Sentence
    expect(character.sentence).toBe(
      'I am a Tough Glaive who Explores Dark Places.'
    );
    expect(character.name).toBe('Kael');
    expect(character.tier).toBe(1);
    expect(character.effort).toBe(1);

    // Pools: Might 11+1+3=15, Speed 10+0+2=12, Intellect 7+0+1=8
    expect(character.pools.might.pool).toBe(15);
    expect(character.pools.speed.pool).toBe(12);
    expect(character.pools.intellect.pool).toBe(8);

    // Edge: Glaive base (1,1,0), no descriptor edge, no flex
    expect(character.pools.might.edge).toBe(1);
    expect(character.pools.speed.edge).toBe(1);
    expect(character.pools.intellect.edge).toBe(0);

    // Skills — climbing from both Glaive skill choice and Focus → specialized
    expect(character.skills.specialized).toContain('climbing');
    expect(character.skills.trained).not.toContain('climbing');

    // Remaining trained skills from Focus and Tough
    expect(character.skills.trained).toContain('searching');
    expect(character.skills.trained).toContain('listening');
    expect(character.skills.trained).toContain('jumping');
    expect(character.skills.trained).toContain('balancing');
    expect(character.skills.trained).toContain('might defense actions');

    // Inabilities from Glaive and Tough
    expect(character.skills.inabilities).toContain('crafting numenera');
    expect(character.skills.inabilities).toContain('salvaging numenera');
    expect(character.skills.inabilities).toContain('understanding numenera');
    expect(character.skills.inabilities).toContain('initiative');
    expect(character.skills.inabilities).toContain('charm and persuasion');

    // Abilities
    const abilityNames = character.abilities.map(a => a.name);
    expect(abilityNames).toContain('Combat Prowess');
    expect(abilityNames).toContain('Trained in Armor');
    expect(abilityNames).toContain('Practiced With All Weapons');
    expect(abilityNames).toContain('Bash');
    expect(abilityNames).toContain('No Need for Weapons');
    expect(abilityNames).toContain('Trained Explorer');

    // Cypher limit
    expect(character.cypherLimit).toBe(2);

    // Equipment from type + descriptor + focus
    expect(character.equipment.length).toBeGreaterThan(0);

    // Shins: Glaive base is 5
    expect(character.shins).toBeGreaterThanOrEqual(5);

    // Background & link
    expect(character.background).toBe('Intensive Training');
    expect(character.connection).toBe(
      'Pick one other PC. This character once saved your life underground.'
    );
  });

  it('returns null for unknown type/descriptor/focus', () => {
    expect(
      assembleCharacter({
        typeId: 'nonexistent',
        descriptorId: 'tough',
        focusId: 'explores-dark-places',
        bonusAllocation: { might: 2, speed: 2, intellect: 2 },
        chosenAbilityIds: [],
        chosenSkills: [],
        backgroundName: '',
        initialLink: '',
        connection: '',
        characterName: 'Test',
        notes: '',
      })
    ).toBeNull();
  });
});
