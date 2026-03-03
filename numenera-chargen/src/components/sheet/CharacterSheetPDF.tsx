// src/components/sheet/CharacterSheetPDF.tsx
//
// Form-fillable AcroForm PDF generation using pdf-lib.
// Replaces the previous @react-pdf/renderer static PDF.

import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFPage,
  PDFForm,
  PDFFont,
  PDFTextField,
} from 'pdf-lib';
import type { Character } from '../../types/Character';

// --- Page Setup ---
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;  // 540
const COL_HALF = CONTENT_WIDTH / 2;             // 270
const COL_THIRD = CONTENT_WIDTH / 3;            // 180

// --- Font Sizes ---
const SIZE_NAME = 16;
const SIZE_HEADER = 11;
const SIZE_STAT_LABEL = 10;
const SIZE_BODY = 10;
const SIZE_SMALL = 8;
const SIZE_POOL_VALUE = 14;
const SIZE_SENTENCE = 11;

// --- Spacing ---
const FIELD_HEIGHT = 18;
const FIELD_HEIGHT_POOL = 24;
const FIELD_HEIGHT_SMALL = 14;
const CHECKBOX_SIZE = 14;
const ROW_SPACING = 20;
const SECTION_GAP = 8;
const SECTION_SPACING = 16;
const HEADER_BAR_HEIGHT = 20;

// --- Colors ---
const PAGE_BG = rgb(0.98, 0.98, 0.97);
const HEADER_BAR_BG = rgb(0.15, 0.18, 0.22);
const HEADER_BAR_TEXT = rgb(0.92, 0.94, 0.96);
const ACCENT = rgb(0.18, 0.62, 0.65);
const FIELD_BG = rgb(1, 1, 1);
const FIELD_BORDER = rgb(0.65, 0.68, 0.72);
const POOL_FIELD_BG = rgb(0.88, 0.95, 0.95);
const POOL_FIELD_BORDER = ACCENT;
const PANEL_BG = rgb(0.95, 0.96, 0.96);
const DIVIDER = rgb(0.75, 0.78, 0.82);
const TEXT_PRIMARY = rgb(0.12, 0.14, 0.17);
const TEXT_SECONDARY = rgb(0.25, 0.28, 0.32);
const FIELD_BORDER_WIDTH = 0.75;

// --- Helper Functions ---

function addTextField(
  form: PDFForm,
  page: PDFPage,
  font: PDFFont,
  opts: {
    name: string;
    x: number;
    y: number;
    width: number;
    height?: number;
    value?: string;
    fontSize?: number;
    multiline?: boolean;
    readOnly?: boolean;
    backgroundColor?: ReturnType<typeof rgb>;
    borderColor?: ReturnType<typeof rgb>;
    borderWidth?: number;
    alignment?: number;
  }
): PDFTextField {
  const field = form.createTextField(opts.name);
  if (opts.value) field.setText(opts.value);
  if (opts.multiline) field.enableMultiline();
  if (opts.readOnly) field.enableReadOnly();

  const isReadOnly = opts.readOnly ?? false;

  field.addToPage(page, {
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height ?? FIELD_HEIGHT,
    borderColor: isReadOnly ? rgb(1, 1, 1) : (opts.borderColor ?? FIELD_BORDER),
    backgroundColor: isReadOnly ? PAGE_BG : (opts.backgroundColor ?? FIELD_BG),
    borderWidth: isReadOnly ? 0 : (opts.borderWidth ?? FIELD_BORDER_WIDTH),
    font,
  });

  field.setFontSize(opts.fontSize ?? SIZE_BODY);

  return field;
}

function addCheckbox(
  form: PDFForm,
  page: PDFPage,
  font: PDFFont,
  opts: {
    name: string;
    label: string;
    x: number;
    y: number;
    checked?: boolean;
  }
): void {
  const cb = form.createCheckBox(opts.name);
  cb.addToPage(page, {
    x: opts.x,
    y: opts.y,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderColor: ACCENT,
    borderWidth: 1,
    backgroundColor: FIELD_BG,
  });
  if (opts.checked) cb.check();

  page.drawText(opts.label, {
    x: opts.x + CHECKBOX_SIZE + 4,
    y: opts.y + 2,
    size: SIZE_BODY,
    font,
    color: TEXT_PRIMARY,
  });
}

function drawSectionHeader(
  page: PDFPage, fontBold: PDFFont,
  text: string, x: number, y: number, width: number
): number {
  const barHeight = HEADER_BAR_HEIGHT;
  const textY = y - barHeight + 5;

  page.drawRectangle({
    x, y: y - barHeight, width, height: barHeight,
    color: HEADER_BAR_BG,
  });

  page.drawText(text, {
    x: x + 8, y: textY,
    size: SIZE_HEADER,
    font: fontBold,
    color: HEADER_BAR_TEXT,
  });

  page.drawLine({
    start: { x, y: y - barHeight },
    end: { x: x + width, y: y - barHeight },
    thickness: 1.5,
    color: ACCENT,
  });

  return y - barHeight - SECTION_GAP;
}

function drawPanel(page: PDFPage, x: number, y: number, width: number, height: number): void {
  page.drawRectangle({
    x, y: y - height, width, height,
    color: PANEL_BG,
    borderColor: DIVIDER,
    borderWidth: 0.5,
  });
}


// --- Section Drawing Functions ---

function drawIdentitySection(
  page: PDFPage, form: PDFForm, font: PDFFont, _fontBold: PDFFont, fontItalic: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;

  // Character name field — large with accent underline
  const nameW = 340;
  const nameH = 22;
  const nameFieldY = y - nameH;

  addTextField(form, page, font, {
    name: 'character.name',
    x: MARGIN,
    y: nameFieldY,
    width: nameW,
    height: nameH,
    value: character.name || '',
    fontSize: SIZE_NAME,
    borderColor: rgb(1, 1, 1),
    borderWidth: 0,
  });

  // Accent underline beneath name
  page.drawLine({
    start: { x: MARGIN, y: nameFieldY },
    end: { x: MARGIN + nameW, y: nameFieldY },
    thickness: 2,
    color: ACCENT,
  });

  // Tier, Effort, XP — to the right of name
  const rightX = MARGIN + nameW + 15;
  const smallW = 40;

  page.drawText('Tier:', { x: rightX, y: y - 12, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'character.tier',
    x: rightX + 25,
    y: y - nameH,
    width: smallW,
    height: FIELD_HEIGHT,
    value: String(character.tier),
    fontSize: SIZE_BODY,
  });

  page.drawText('Effort:', { x: rightX + 75, y: y - 12, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'character.effort',
    x: rightX + 110,
    y: y - nameH,
    width: smallW,
    height: FIELD_HEIGHT,
    value: String(character.effort),
    fontSize: SIZE_BODY,
  });

  y -= nameH + 4;

  // Character sentence — static italic text
  page.drawText(character.sentence, {
    x: MARGIN,
    y: y - 14,
    size: SIZE_SENTENCE,
    font: fontItalic,
    color: TEXT_SECONDARY,
  });
  y -= 20;

  // Background and XP on same row
  const bgLabelW = 75;
  page.drawText('Background:', { x: MARGIN, y: y - 12, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'background',
    x: MARGIN + bgLabelW,
    y: y - FIELD_HEIGHT,
    width: 310,
    height: FIELD_HEIGHT,
    value: character.background || '',
  });

  page.drawText('XP:', { x: MARGIN + bgLabelW + 320, y: y - 12, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'character.xp',
    x: MARGIN + bgLabelW + 340,
    y: y - FIELD_HEIGHT,
    width: 50,
    height: FIELD_HEIGHT,
    value: '0',
  });

  y -= FIELD_HEIGHT + 4;

  // Divider line
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: DIVIDER,
  });

  return y - 6;
}

function drawStatPoolsSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'STAT POOLS', MARGIN, y, CONTENT_WIDTH);

  const panelH = 100;
  drawPanel(page, MARGIN, y, CONTENT_WIDTH, panelH);

  const stats = ['might', 'speed', 'intellect'] as const;
  const colW = COL_THIRD;

  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const colX = MARGIN + i * colW;
    const pool = character.pools[stat];

    // Vertical divider between columns
    if (i > 0) {
      page.drawLine({
        start: { x: colX, y },
        end: { x: colX, y: y - panelH },
        thickness: 0.5,
        color: DIVIDER,
      });
    }

    // Stat label in accent color — centered above fields
    const labelText = stat.toUpperCase();
    const labelW = fontBold.widthOfTextAtSize(labelText, SIZE_STAT_LABEL);
    page.drawText(labelText, {
      x: colX + (colW - labelW) / 2,
      y: y - 14,
      size: SIZE_STAT_LABEL,
      font: fontBold,
      color: ACCENT,
    });

    // Fields start below label: label baseline y-14, font ~10px tall,
    // so field top must be at y-26 or lower → rowY = y-34 (field top = y-34+18 = y-16)
    const fieldX = colX + 55;
    const fieldW = 55;
    let rowY = y - 34;

    // Max
    page.drawText('Max:', { x: colX + 12, y: rowY + 4, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
    addTextField(form, page, font, {
      name: `${stat}.pool.max`,
      x: fieldX, y: rowY,
      width: fieldW, height: FIELD_HEIGHT,
      value: String(pool.pool),
    });
    rowY -= FIELD_HEIGHT + 4;

    // Current
    page.drawText('Current:', { x: colX + 12, y: rowY + 6, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
    addTextField(form, page, font, {
      name: `${stat}.pool.current`,
      x: fieldX, y: rowY,
      width: fieldW, height: FIELD_HEIGHT_POOL,
      value: String(pool.pool),
      fontSize: SIZE_POOL_VALUE,
      backgroundColor: POOL_FIELD_BG,
      borderColor: POOL_FIELD_BORDER,
      borderWidth: 1.5,
    });
    rowY -= FIELD_HEIGHT_POOL + 4;

    // Edge
    page.drawText('Edge:', { x: colX + 12, y: rowY + 4, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
    addTextField(form, page, font, {
      name: `${stat}.edge`,
      x: fieldX, y: rowY,
      width: fieldW, height: FIELD_HEIGHT,
      value: String(pool.edge),
    });
  }

  return y - panelH - SECTION_SPACING;
}

function drawRecoveryAndDamageSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'RECOVERY & DAMAGE TRACK', MARGIN, y, CONTENT_WIDTH);

  const panelH = 84;

  // Recovery panel (left half)
  drawPanel(page, MARGIN, y, COL_HALF - 5, panelH);

  // Damage panel (right half)
  drawPanel(page, MARGIN + COL_HALF + 5, y, COL_HALF - 5, panelH);

  // Recovery checkboxes
  let cbY = y - 16;
  const recoveries = [
    { name: 'recovery.action', label: '1 Action' },
    { name: 'recovery.tenMin', label: '10 Minutes' },
    { name: 'recovery.oneHour', label: '1 Hour' },
    { name: 'recovery.tenHours', label: '10 Hours' },
  ];
  for (const rec of recoveries) {
    addCheckbox(form, page, font, { ...rec, x: MARGIN + 8, y: cbY });
    cbY -= 16;
  }

  // Recovery roll text
  page.drawText(`Recovery: 1d6 + ${character.recoveryRollBonus}`, {
    x: MARGIN + 8,
    y: y - panelH + 6,
    size: SIZE_SMALL,
    font,
    color: TEXT_SECONDARY,
  });

  // Damage track
  const dmgX = MARGIN + COL_HALF + 15;
  let dmgY = y - 20;

  page.drawText('Hale', { x: dmgX, y: dmgY + 2, size: SIZE_BODY, font: fontBold, color: TEXT_PRIMARY });
  dmgY -= 20;

  page.drawText('>', { x: dmgX, y: dmgY + 2, size: SIZE_BODY, font, color: TEXT_SECONDARY });
  addCheckbox(form, page, font, { name: 'damage.impaired', label: 'Impaired', x: dmgX + 14, y: dmgY });
  dmgY -= 20;

  page.drawText('>', { x: dmgX, y: dmgY + 2, size: SIZE_BODY, font, color: TEXT_SECONDARY });
  addCheckbox(form, page, font, { name: 'damage.debilitated', label: 'Debilitated', x: dmgX + 14, y: dmgY });
  dmgY -= 18;

  page.drawText('>', { x: dmgX, y: dmgY + 2, size: SIZE_BODY, font, color: TEXT_SECONDARY });
  addCheckbox(form, page, font, { name: 'damage.dead', label: 'Dead', x: dmgX + 14, y: dmgY });

  return y - panelH - SECTION_SPACING;
}

function drawSkillsSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'SKILLS', MARGIN, y, CONTENT_WIDTH);

  const leftX = MARGIN;
  const rightX = MARGIN + COL_HALF + 10;
  const fieldW = COL_HALF - 20;

  // Left column: Trained skills
  page.drawText('TRAINED', { x: leftX, y: y - 12, size: SIZE_SMALL, font: fontBold, color: TEXT_SECONDARY });
  let leftY = y - 24;

  for (let i = 0; i < character.skills.trained.length; i++) {
    addTextField(form, page, font, {
      name: `skills.trained.${i}`,
      x: leftX, y: leftY,
      width: fieldW, height: FIELD_HEIGHT,
      value: character.skills.trained[i],
    });
    leftY -= ROW_SPACING;
  }
  for (let j = 1; j <= 2; j++) {
    addTextField(form, page, font, {
      name: `skills.trained.extra.${j}`,
      x: leftX, y: leftY,
      width: fieldW, height: FIELD_HEIGHT,
    });
    leftY -= ROW_SPACING;
  }

  // Right column: Specialized + Inabilities
  page.drawText('SPECIALIZED', { x: rightX, y: y - 12, size: SIZE_SMALL, font: fontBold, color: TEXT_SECONDARY });
  let rightY = y - 24;

  for (let i = 0; i < character.skills.specialized.length; i++) {
    addTextField(form, page, font, {
      name: `skills.specialized.${i}`,
      x: rightX, y: rightY,
      width: fieldW, height: FIELD_HEIGHT,
      value: character.skills.specialized[i],
    });
    rightY -= ROW_SPACING;
  }
  for (let j = 1; j <= 1; j++) {
    addTextField(form, page, font, {
      name: `skills.specialized.extra.${j}`,
      x: rightX, y: rightY,
      width: fieldW, height: FIELD_HEIGHT,
    });
    rightY -= ROW_SPACING;
  }

  // Inabilities
  rightY -= 12;
  page.drawText('INABILITIES', { x: rightX, y: rightY, size: SIZE_SMALL, font: fontBold, color: TEXT_SECONDARY });
  rightY -= 20;

  for (let i = 0; i < character.skills.inabilities.length; i++) {
    addTextField(form, page, font, {
      name: `skills.inabilities.${i}`,
      x: rightX, y: rightY,
      width: fieldW, height: FIELD_HEIGHT,
      value: character.skills.inabilities[i],
    });
    rightY -= ROW_SPACING;
  }

  const bottomY = Math.min(leftY, rightY);
  return bottomY - SECTION_SPACING + ROW_SPACING;
}

function drawAttacksSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'ATTACKS', MARGIN, y, CONTENT_WIDTH);

  // Column widths
  const cols = [
    { label: 'Weapon', width: 140 },
    { label: 'Skill', width: 45 },
    { label: 'Damage', width: 60 },
    { label: 'Range', width: 60 },
    { label: 'Notes', width: CONTENT_WIDTH - 140 - 45 - 60 - 60 },
  ];

  // Table header background
  const headerRowH = 16;
  page.drawRectangle({
    x: MARGIN, y: y - headerRowH,
    width: CONTENT_WIDTH, height: headerRowH,
    color: rgb(0.90, 0.91, 0.93),
  });

  // Header labels
  let colX = MARGIN;
  for (const col of cols) {
    page.drawText(col.label, {
      x: colX + 4, y: y - headerRowH + 4,
      size: SIZE_SMALL, font: fontBold, color: TEXT_SECONDARY,
    });
    colX += col.width;
  }
  y -= headerRowH + 4;

  // Weapon rows from character data
  const allWeapons = [...character.weapons];
  const totalRows = allWeapons.length + 1; // + 1 blank

  for (let row = 0; row < totalRows; row++) {
    const isPreFilled = row < allWeapons.length;
    const prefix = isPreFilled ? `attacks.${row}` : `attacks.extra.${row - allWeapons.length + 1}`;

    colX = MARGIN;
    for (let c = 0; c < cols.length; c++) {
      const colDef = cols[c];
      const fieldName = `${prefix}.${['name', 'skill', 'damage', 'range', 'notes'][c]}`;
      let value = '';
      if (isPreFilled) {
        if (c === 0) value = allWeapons[row];
        if (c === 1) value = '-'; // dash default
      }

      addTextField(form, page, font, {
        name: fieldName,
        x: colX, y: y - FIELD_HEIGHT_SMALL,
        width: colDef.width - 2, height: FIELD_HEIGHT_SMALL,
        value: value || undefined,
        fontSize: SIZE_SMALL,
      });
      colX += colDef.width;
    }
    y -= FIELD_HEIGHT_SMALL + 3;
  }

  return y - SECTION_SPACING + 8;
}

function drawArmorShinsSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'ARMOR & CURRENCY', MARGIN, y, CONTENT_WIDTH);

  page.drawText('Armor:', { x: MARGIN, y: y - 12, size: SIZE_BODY, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'armor',
    x: MARGIN + 45, y: y - FIELD_HEIGHT,
    width: 250, height: FIELD_HEIGHT,
    value: character.armor || '',
  });

  page.drawText('Shins:', { x: MARGIN + 320, y: y - 12, size: SIZE_BODY, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'shins',
    x: MARGIN + 365, y: y - FIELD_HEIGHT,
    width: 80, height: FIELD_HEIGHT,
    value: String(character.shins),
  });

  return y - FIELD_HEIGHT - SECTION_SPACING;
}

function drawAbilitiesSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'SPECIAL ABILITIES', MARGIN, y, CONTENT_WIDTH);

  const extraSlots = 2;
  const totalSlots = character.abilities.length + extraSlots;
  // Single multiline field per ability to keep it compact
  const slotH = Math.min(36, Math.max(26, (y - MARGIN - 350) / totalSlots));

  // Pre-filled abilities
  for (let i = 0; i < character.abilities.length; i++) {
    const a = character.abilities[i];
    const costStr = a.cost ? ` (${a.cost.amount} ${a.cost.pool})` : ' (Enabler)';

    addTextField(form, page, font, {
      name: `abilities.${i}`,
      x: MARGIN, y: y - slotH,
      width: CONTENT_WIDTH, height: slotH,
      value: `${a.name}${costStr}: ${a.description}`,
      fontSize: 8,
      multiline: true,
    });
    y -= slotH + 3;
  }

  // Blank ability slots
  for (let j = 1; j <= extraSlots; j++) {
    addTextField(form, page, font, {
      name: `abilities.extra.${j}`,
      x: MARGIN, y: y - slotH,
      width: CONTENT_WIDTH, height: slotH,
      fontSize: 8,
      multiline: true,
    });
    y -= slotH + 3;
  }

  return y - SECTION_SPACING + 8;
}

function drawCyphersSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'CYPHERS', MARGIN, y, CONTENT_WIDTH);

  // Cypher limit
  page.drawText('Limit:', { x: MARGIN, y: y - 12, size: SIZE_BODY, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'cyphers.limit',
    x: MARGIN + 40, y: y - FIELD_HEIGHT,
    width: 40, height: FIELD_HEIGHT,
    value: String(character.cypherLimit),
  });
  y -= FIELD_HEIGHT + 6;

  // Cypher slots
  const cypherEffectH = 22;
  const cypherSlotCount = Math.min(3, character.cypherLimit || 2);
  for (let i = 1; i <= cypherSlotCount; i++) {
    drawPanel(page, MARGIN, y, CONTENT_WIDTH, FIELD_HEIGHT + cypherEffectH + 6);

    page.drawText(`${i}.`, { x: MARGIN + 4, y: y - 12, size: SIZE_BODY, font: fontBold, color: TEXT_PRIMARY });

    addTextField(form, page, font, {
      name: `cyphers.${i}.name`,
      x: MARGIN + 18, y: y - FIELD_HEIGHT,
      width: CONTENT_WIDTH - 22, height: FIELD_HEIGHT,
      fontSize: SIZE_BODY,
    });
    y -= FIELD_HEIGHT + 2;

    addTextField(form, page, font, {
      name: `cyphers.${i}.effect`,
      x: MARGIN + 18, y: y - cypherEffectH,
      width: CONTENT_WIDTH - 22, height: cypherEffectH,
      fontSize: 9,
      multiline: true,
    });
    y -= cypherEffectH + 6;
  }

  return y - SECTION_SPACING + 8;
}

function drawEquipmentSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'EQUIPMENT', MARGIN, y, CONTENT_WIDTH);

  const equipH = 80;
  const equipText = character.equipment.join('\n');

  drawPanel(page, MARGIN, y, CONTENT_WIDTH, equipH);
  addTextField(form, page, font, {
    name: 'equipment',
    x: MARGIN, y: y - equipH,
    width: CONTENT_WIDTH, height: equipH,
    value: equipText,
    fontSize: 8,
    multiline: true,
    borderColor: ACCENT,
    borderWidth: 1,
  });

  return y - equipH - SECTION_SPACING;
}

function drawNarrativeSection(
  page: PDFPage, form: PDFForm, font: PDFFont, fontBold: PDFFont,
  character: Character, startY: number
): number {
  let y = startY;
  y = drawSectionHeader(page, fontBold, 'NARRATIVE & NOTES', MARGIN, y, CONTENT_WIDTH);

  // Connection
  page.drawText('Connection:', { x: MARGIN, y: y - 10, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'connection',
    x: MARGIN + 65, y: y - FIELD_HEIGHT,
    width: CONTENT_WIDTH - 65, height: FIELD_HEIGHT,
    value: character.connection || '',
    fontSize: SIZE_SMALL,
  });
  y -= FIELD_HEIGHT + 4;

  // Initial Link
  page.drawText('Initial Link:', { x: MARGIN, y: y - 10, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  addTextField(form, page, font, {
    name: 'initialLink',
    x: MARGIN + 65, y: y - FIELD_HEIGHT,
    width: CONTENT_WIDTH - 65, height: FIELD_HEIGHT,
    value: character.initialLink || '',
    fontSize: SIZE_SMALL,
  });
  y -= FIELD_HEIGHT + 4;

  // Notes — fill remaining space down to bottom margin
  page.drawText('Notes:', { x: MARGIN, y: y - 10, size: SIZE_SMALL, font, color: TEXT_SECONDARY });
  y -= 14;
  const notesH = Math.max(30, y - MARGIN);

  drawPanel(page, MARGIN, y, CONTENT_WIDTH, notesH);
  addTextField(form, page, font, {
    name: 'notes',
    x: MARGIN, y: y - notesH,
    width: CONTENT_WIDTH, height: notesH,
    value: character.notes || '',
    fontSize: 9,
    multiline: true,
    borderColor: ACCENT,
    borderWidth: 1,
  });

  return y - notesH;
}

// --- Main Export ---

export async function generatePDF(character: Character): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const form = pdfDoc.getForm();

  // ---- PAGE 1 ----
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page1.drawRectangle({
    x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAGE_BG,
  });

  let y = PAGE_HEIGHT - MARGIN;

  y = drawIdentitySection(page1, form, font, fontBold, fontItalic, character, y);
  y = drawStatPoolsSection(page1, form, font, fontBold, character, y);
  y = drawRecoveryAndDamageSection(page1, form, font, fontBold, character, y);
  y = drawSkillsSection(page1, form, font, fontBold, character, y);
  y = drawAttacksSection(page1, form, font, fontBold, character, y);
  drawArmorShinsSection(page1, form, font, fontBold, character, y);


  // ---- PAGE 2 ----
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page2.drawRectangle({
    x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAGE_BG,
  });

  y = PAGE_HEIGHT - MARGIN;

  y = drawAbilitiesSection(page2, form, font, fontBold, character, y);
  y = drawCyphersSection(page2, form, font, fontBold, character, y);
  y = drawEquipmentSection(page2, form, font, fontBold, character, y);
  drawNarrativeSection(page2, form, font, fontBold, character, y);


  // Generate appearance streams so all fields render visually
  form.updateFieldAppearances(font);

  // Serialize
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
