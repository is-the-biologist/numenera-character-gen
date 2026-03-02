import {
  Document, Page, View, Text, StyleSheet, pdf,
} from '@react-pdf/renderer';
import type { Character } from '../../types/Character';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    paddingBottom: 8,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  sentence: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#475569',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerMeta: {
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#e2e8f0',
    padding: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
  },
  poolsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 8,
  },
  poolBox: {
    alignItems: 'center',
    width: '30%',
  },
  poolLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  poolValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  poolEdge: {
    fontSize: 8,
    color: '#64748b',
  },
  skillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skillCol: {
    flex: 1,
  },
  skillColTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  item: {
    fontSize: 8,
    marginBottom: 1,
    paddingLeft: 6,
  },
  abilityName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  abilityDesc: {
    fontSize: 7,
    color: '#475569',
    marginBottom: 2,
    paddingLeft: 6,
  },
  recoveryRow: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    marginBottom: 10,
    fontSize: 8,
  },
  equipRow: {
    flexDirection: 'row',
    gap: 12,
  },
  equipCol: {
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

function CharacterSheetDocument({ character }: { character: Character }) {
  const c = character;
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{c.name || 'Unnamed Character'}</Text>
            <View>
              <Text style={styles.headerMeta}>Tier: {c.tier}  Effort: {c.effort}</Text>
              <Text style={styles.headerMeta}>Cypher Limit: {c.cypherLimit}</Text>
            </View>
          </View>
          <Text style={styles.sentence}>{c.sentence}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerMeta}>Background: {c.background || '—'}</Text>
            <Text style={styles.headerMeta}>XP: 0</Text>
          </View>
        </View>

        {/* Stat Pools */}
        <View style={styles.poolsContainer}>
          {(['might', 'speed', 'intellect'] as const).map(stat => (
            <View key={stat} style={styles.poolBox}>
              <Text style={styles.poolLabel}>{stat}</Text>
              <Text style={styles.poolValue}>{c.pools[stat].pool}</Text>
              <Text style={styles.poolEdge}>Edge: {c.pools[stat].edge}</Text>
            </View>
          ))}
        </View>

        {/* Recovery & Damage Track */}
        <View style={styles.recoveryRow}>
          <Text>Recovery: [ ] 1 Action  [ ] 10 Min  [ ] 1 Hr  [ ] 10 Hr</Text>
          <Text>Recovery Roll: 1d6 + {c.recoveryRollBonus}</Text>
          <Text>Damage Track: [ ] Impaired  [ ] Debilitated</Text>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SKILLS</Text>
          <View style={styles.skillsRow}>
            <View style={styles.skillCol}>
              <Text style={styles.skillColTitle}>Trained</Text>
              {c.skills.trained.map(s => (
                <Text key={s} style={styles.item}>• {s}</Text>
              ))}
            </View>
            <View style={styles.skillCol}>
              <Text style={styles.skillColTitle}>Specialized</Text>
              {c.skills.specialized.map(s => (
                <Text key={s} style={styles.item}>• {s}</Text>
              ))}
              {c.skills.specialized.length === 0 && (
                <Text style={styles.item}>—</Text>
              )}
            </View>
            <View style={styles.skillCol}>
              <Text style={styles.skillColTitle}>Inabilities</Text>
              {c.skills.inabilities.map(s => (
                <Text key={s} style={styles.item}>• {s}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Abilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SPECIAL ABILITIES</Text>
          {c.abilities.map(a => (
            <View key={a.id}>
              <Text style={styles.abilityName}>
                • {a.name}
                {a.cost ? ` (${a.cost.amount} ${a.cost.pool})` : ' (Enabler)'}
              </Text>
              <Text style={styles.abilityDesc}>{a.description}</Text>
            </View>
          ))}
        </View>

        {/* Equipment & Cyphers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EQUIPMENT & CYPHERS</Text>
          <View style={styles.equipRow}>
            <View style={styles.equipCol}>
              {c.weapons.length > 0 && (
                <>
                  <Text style={styles.skillColTitle}>Weapons</Text>
                  {c.weapons.map((w, i) => <Text key={i} style={styles.item}>• {w}</Text>)}
                </>
              )}
              <Text style={styles.skillColTitle}>Armor</Text>
              <Text style={styles.item}>{c.armor}</Text>
              <Text style={styles.skillColTitle}>Equipment</Text>
              {c.equipment.map((e, i) => <Text key={i} style={styles.item}>• {e}</Text>)}
              <Text style={styles.item}>Shins: {c.shins}</Text>
            </View>
            <View style={styles.equipCol}>
              <Text style={styles.skillColTitle}>Cyphers (Limit: {c.cypherLimit})</Text>
              {Array.from({ length: c.cypherLimit }, (_, i) => (
                <Text key={i} style={styles.item}>{i + 1}. ___________________</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Connection, Link, Notes */}
        <View style={styles.section}>
          {c.connection && (
            <Text style={styles.item}>Connection: {c.connection}</Text>
          )}
          {c.initialLink && (
            <Text style={styles.item}>Initial Link: {c.initialLink}</Text>
          )}
          {c.notes && (
            <Text style={styles.item}>Notes: {c.notes}</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Numenera is a product of Monte Cook Games, LLC.</Text>
          <Text>Character generated with Numenera Character Sheet Generator.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generatePDF(character: Character): Promise<Blob> {
  return await pdf(<CharacterSheetDocument character={character} />).toBlob();
}

export default CharacterSheetDocument;
