/**
 * Scrapes focus connection options from the SRD character-options pages
 * and updates foci.json with connection arrays.
 *
 * Usage: npx tsx scripts/scrape-connections.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://numenera2e.wikidot.com';
const FOCI_FILE = path.resolve(__dirname, '../src/data/foci.json');

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface ConnectionMap {
  [focusId: string]: string[];
}

async function scrapeConnectionsFromPage(urlPath: string): Promise<ConnectionMap> {
  const url = `${BASE}${urlPath}`;
  console.log(`Fetching: ${url}`);
  const { data } = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(data);
  const content = $('#page-content');
  const results: ConnectionMap = {};

  content.find('h3').each((_, h3) => {
    const rawName = $(h3).find('span').text().trim() || $(h3).text().trim();
    if (!rawName || /overview|general/i.test(rawName)) return;

    const name = rawName.replace(/\*+$/, '').trim();
    const id = toKebab(name);

    // Collect all text until next h3
    let text = '';
    let el = $(h3).next();
    while (el.length && !el.is('h3,h1,hr')) {
      text += el.text() + '\n';
      el = el.next();
    }

    // Extract connection section
    const connMatch = text.match(/Connection[:\s]+(.+?)(?=Tier \d|GM Intrusion|Minor Effect|$)/is);
    if (!connMatch) return;

    const connText = connMatch[1].trim();
    const numbered = [...connText.matchAll(/\d+\.\s*(.+?)(?=\n\d+\.|\n*$)/gs)];

    if (numbered.length > 0) {
      results[id] = numbered.map(m => m[1].trim()).filter(s => s.length > 5);
    } else {
      // Single connection line
      const lines = connText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      if (lines.length > 0) {
        results[id] = lines;
      }
    }
  });

  return results;
}

async function main() {
  console.log('=== Scraping Focus Connections ===\n');

  const pages = ['/character-options-1-foci', '/character-options-2-foci', '/foci'];
  const allConnections: ConnectionMap = {};

  for (const page of pages) {
    try {
      const connections = await scrapeConnectionsFromPage(page);
      Object.assign(allConnections, connections);
      console.log(`  Found connections for ${Object.keys(connections).length} foci from ${page}`);
    } catch (e: any) {
      console.error(`  Failed to scrape ${page}: ${e.message}`);
    }
  }

  console.log(`\nTotal connections found: ${Object.keys(allConnections).length}`);

  // Read existing foci.json
  const foci = JSON.parse(fs.readFileSync(FOCI_FILE, 'utf8'));
  let updated = 0;

  for (const focus of foci) {
    const connections = allConnections[focus.id];
    if (connections && connections.length > 0) {
      focus.connections = connections;
      updated++;
      console.log(`  ${focus.name}: ${connections.length} connection options`);
    } else {
      // Keep existing connection as a single-item array if it has content
      if (focus.connection && focus.connection.length > 10 && focus.connection !== 'Choose one of the following.') {
        focus.connections = [focus.connection];
        console.log(`  ${focus.name}: kept existing single connection`);
      } else {
        focus.connections = [];
        console.log(`  ${focus.name}: no connections found`);
      }
    }
  }

  // Write back
  fs.writeFileSync(FOCI_FILE, JSON.stringify(foci, null, 2) + '\n');
  console.log(`\nUpdated ${updated} foci with scraped connections.`);
  console.log('Done.');
}

main().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});
