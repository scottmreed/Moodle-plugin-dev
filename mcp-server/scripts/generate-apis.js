#!/usr/bin/env node

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const SOURCE_URL = 'https://moodledev.io/docs/4.5/apis';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'apis.json');

const stripControl = (value) =>
  value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value) =>
  stripControl(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const dedupeReferences = (items) => {
  const seen = new Map();
  for (const item of items) {
    const key = item.url;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
};

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function parseApis(html) {
  const $ = load(html);
  const root = $('article .theme-doc-markdown');
  if (!root.length) {
    throw new Error('Failed to locate API content in the Moodle documentation page.');
  }

  const baseUrl = new URL(SOURCE_URL);
  const apis = [];
  let currentCategory = null;
  let currentCategoryId = null;
  const slugCounter = new Map();

  root.children().each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    if (!tag) {
      return;
    }

    if (tag === 'h2') {
      currentCategory = stripControl($(element).text());
      currentCategoryId = $(element).attr('id') || slugify(currentCategory || 'category');
      return;
    }

    if (tag !== 'h3') {
      return;
    }

    const title = stripControl($(element).text());
    const anchorId = $(element).attr('id') || slugify(title);

    const slugFromTitle = (() => {
      const match = title.match(/\(([^)]+)\)\s*(?:-|$)/);
      if (match) {
        return slugify(match[1]);
      }
      return null;
    })();

    const slugFromAnchor = (() => {
      if (!anchorId) {
        return null;
      }
      const anchorParts = anchorId.split('-').filter(Boolean);
      if (!anchorParts.length) {
        return null;
      }
      const lastPart = anchorParts[anchorParts.length - 1];
      if (lastPart === 'api') {
        return slugify(anchorId);
      }
      return slugify(lastPart);
    })();

    let slug = slugFromTitle || slugFromAnchor || slugify(title);
    if (!slug) {
      throw new Error(`Unable to determine slug for API heading: ${title}`);
    }

    const counter = slugCounter.get(slug) || 0;
    if (counter > 0) {
      slug = `${slug}-${counter + 1}`;
    }
    slugCounter.set(slug, counter + 1);

    const descriptionParts = [];
    const references = [];
    let cursor = $(element).next();

    while (cursor.length) {
      const cursorTag = cursor[0].tagName?.toLowerCase();
      if (!cursorTag || cursorTag === 'h2' || cursorTag === 'h3') {
        break;
      }

      if (['p', 'blockquote', 'div'].includes(cursorTag)) {
        const text = stripControl(cursor.text());
        if (text) {
          descriptionParts.push(text);
        }
      }

      if (['ul', 'ol'].includes(cursorTag)) {
        cursor.find('li').each((__, li) => {
          const text = stripControl($(li).text());
          if (text) {
            descriptionParts.push(text);
          }
        });
      }

      cursor.find('a[href]').each((__, link) => {
        const href = $(link).attr('href');
        if (!href) {
          return;
        }
        try {
          const resolvedUrl = new URL(href, baseUrl);
          const label = stripControl($(link).text()) || resolvedUrl.toString();
          references.push({
            title: label,
            url: resolvedUrl.toString()
          });
        } catch (error) {
          // Ignore malformed URLs while continuing to parse others.
        }
      });

      cursor = cursor.next();
    }

    apis.push({
      title,
      slug,
      anchorId,
      category: currentCategory,
      categoryId: currentCategoryId,
      summary: descriptionParts.join(' '),
      references: dedupeReferences(references)
    });
  });

  return apis;
}

async function main() {
  const html = await fetchHtml(SOURCE_URL);
  const apis = await parseApis(html);

  await mkdir(DATA_DIR, { recursive: true });
  const payload = {
    source: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    count: apis.length,
    apis
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${apis.length} API entries to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
