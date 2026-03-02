import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getTypeById, getDescriptorById, getFocusById } from '../../data';
import { generatePDF } from '../sheet/CharacterSheetPDF';

export default function StepReview() {
  const store = useCharacterStore();
  const {
    typeId, descriptorId, focusId,
    characterName, setCharacterName,
    backgroundName, setBackground,
    initialLink, setInitialLink,
    connection, setConnection,
    notes, setNotes,
  } = store;

  const type = typeId ? getTypeById(typeId) : undefined;
  const descriptor = descriptorId ? getDescriptorById(descriptorId) : undefined;
  const focus = focusId ? getFocusById(focusId) : undefined;

  const [downloading, setDownloading] = useState(false);

  const errors = store.getValidationErrors();
  const character = store.getAssembledCharacter();

  const handleDownload = async () => {
    if (!character) return;
    setDownloading(true);
    try {
      const blob = await generatePDF(character);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${character.name || 'character'}-character-sheet.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 7: Review & Finalize</h2>

      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-red-400 mb-2">Validation Errors</h3>
          <ul className="text-sm text-red-300 space-y-1">
            {errors.map((e, i) => <li key={i}>- {e}</li>)}
          </ul>
        </div>
      )}

      {/* Character Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-400 mb-1">Character Name *</label>
        <input
          type="text"
          value={characterName}
          onChange={e => setCharacterName(e.target.value)}
          placeholder="Enter character name..."
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Background */}
      {type && type.backgrounds.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-2">Background</label>
          <div className="space-y-2">
            {type.backgrounds.map(b => (
              <button
                key={b.name}
                onClick={() => setBackground(b.name)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  backgroundName === b.name
                    ? 'border-cyan-500 bg-cyan-900/20'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                }`}
              >
                <h4 className="font-semibold text-sm text-slate-200 mb-1">{b.name}</h4>
                <p className={`text-xs leading-relaxed ${
                  backgroundName === b.name ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {backgroundName === b.name
                    ? b.description
                    : b.description.length > 150
                      ? b.description.substring(0, 150) + '...'
                      : b.description
                  }
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Initial Link */}
      {descriptor && descriptor.initialLinks.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-1">Initial Link to Starting Adventure</label>
          <select
            value={initialLink}
            onChange={e => setInitialLink(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">— Select Link —</option>
            {descriptor.initialLinks.map((l, i) => (
              <option key={i} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Connection */}
      {focus && focus.connections && focus.connections.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-1">Focus Connection</label>
          <select
            value={connection}
            onChange={e => setConnection(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none mb-2"
          >
            <option value="">— Select a connection —</option>
            {focus.connections.map((c, i) => (
              <option key={i} value={c}>{c.length > 100 ? c.substring(0, 100) + '...' : c}</option>
            ))}
          </select>
          {connection && (
            <p className="text-sm text-slate-300 bg-slate-800/50 border border-slate-700 rounded p-3 italic">
              {connection}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none resize-y"
        />
      </div>

      {/* Character Summary */}
      {character && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-cyan-300 mb-1">{character.name}</h3>
          <p className="text-slate-300 italic mb-4">{character.sentence}</p>

          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            {(['might', 'speed', 'intellect'] as const).map(stat => (
              <div key={stat} className="bg-slate-900/50 rounded p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{stat}</p>
                <p className="text-2xl font-bold text-cyan-400">{character.pools[stat].pool}</p>
                <p className="text-xs text-slate-400">Edge: {character.pools[stat].edge}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-slate-400">Tier: <span className="text-slate-200">{character.tier}</span></p>
              <p className="text-slate-400">Effort: <span className="text-slate-200">{character.effort}</span></p>
              <p className="text-slate-400">Cypher Limit: <span className="text-slate-200">{character.cypherLimit}</span></p>
            </div>
            <div>
              <p className="text-slate-400">Shins: <span className="text-slate-200">{character.shins}</span></p>
              <p className="text-slate-400">Armor: <span className="text-slate-200">{character.armor}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <h4 className="font-semibold text-emerald-400 mb-1">Specialized</h4>
              {character.skills.specialized.map(s => <p key={s} className="text-slate-300">- {s}</p>)}
              {character.skills.specialized.length === 0 && <p className="text-slate-500 italic">None</p>}
            </div>
            <div>
              <h4 className="font-semibold text-cyan-400 mb-1">Trained</h4>
              {character.skills.trained.map(s => <p key={s} className="text-slate-300">- {s}</p>)}
            </div>
            <div>
              <h4 className="font-semibold text-red-400 mb-1">Inabilities</h4>
              {character.skills.inabilities.map(s => <p key={s} className="text-slate-300">- {s}</p>)}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-slate-300 mb-1 text-sm">Abilities</h4>
            {character.abilities.map(a => (
              <p key={a.id} className="text-sm text-slate-400">
                <strong className="text-slate-300">{a.name}</strong>
                {a.cost && <span className="text-xs"> ({a.cost.amount} {a.cost.pool})</span>}
                {' — '}{a.description}
              </p>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-slate-300 mb-1 text-sm">Equipment</h4>
            {character.equipment.map((e, i) => <p key={i} className="text-sm text-slate-400">- {e}</p>)}
            {character.weapons.length > 0 && (
              <p className="text-sm text-slate-400">Weapons: {character.weapons.join(', ')}</p>
            )}
          </div>

          <button
            disabled={errors.length > 0 || downloading}
            className="mt-4 w-full py-3 rounded-lg bg-cyan-700 text-white font-bold hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={handleDownload}
          >
            {downloading ? 'Generating PDF...' : 'Download Character Sheet'}
          </button>
        </div>
      )}
    </div>
  );
}
