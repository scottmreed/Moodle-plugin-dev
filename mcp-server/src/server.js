#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import express from 'express';
import { z } from 'zod';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'apis.json');

/**
 * Zod schemas ensure the generated dataset matches the structure we expect
 * at runtime. This guards the MCP server against malformed or partial data.
 */
const referenceSchema = z.object({
  title: z.string(),
  url: z.string().url()
});

const apiSchema = z.object({
  title: z.string(),
  slug: z.string(),
  anchorId: z.string(),
  category: z.string(),
  categoryId: z.string(),
  summary: z.string(),
  references: z.array(referenceSchema)
});

const datasetSchema = z.object({
  source: z.string().url(),
  generatedAt: z.string(),
  count: z.number().nonnegative(),
  apis: z.array(apiSchema)
});

const normalize = (value) =>
  (value ?? '')
    .toString()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

const categoryKeyFor = (api) => normalize(api.categoryId || api.category);

async function loadJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadDataset() {
  const dataset = datasetSchema.parse(await loadJson(DATA_FILE));
  if (dataset.count !== dataset.apis.length) {
    console.warn(
      `[moodle-mcp] Dataset count mismatch: expected ${dataset.count}, actual ${dataset.apis.length}`
    );
  }
  return dataset;
}

function buildContext(dataset) {
  const apisBySlug = new Map();
  const aliasIndex = new Map();
  const categories = new Map();

  dataset.apis.forEach((api) => {
    const slugKey = normalize(api.slug);
    apisBySlug.set(slugKey, api);

    aliasIndex.set(slugKey, api);
    aliasIndex.set(normalize(api.anchorId), api);
    aliasIndex.set(normalize(api.title), api);

    const categoryKey = categoryKeyFor(api);
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, {
        id: categoryKey,
        title: api.category,
        apis: []
      });
    }
    categories.get(categoryKey).apis.push(api);
  });

  return {
    dataset,
    apis: dataset.apis,
    apisBySlug,
    aliasIndex,
    categories,
    categoryList: Array.from(categories.values())
  };
}

function formatReferences(references) {
  if (!references.length) {
    return 'No direct documentation links were captured for this entry.';
  }
  return references
    .map((ref) => `- ${ref.title} — ${ref.url}`)
    .join('\n');
}

function formatApiMarkdown(api, dataset) {
  const lines = [
    `# ${api.title}`,
    '',
    `Slug: ${api.slug}`,
    `Category: ${api.category}`,
    `Documentation anchor: ${api.anchorId}`,
    '',
    '## Summary',
    api.summary || 'No summary text was found on the Moodle documentation page.',
    '',
    '## Primary references',
    formatReferences(api.references),
    '',
    `Source catalogue: ${dataset.source}`,
    `Dataset generated: ${dataset.generatedAt}`
  ];
  return lines.join('\n');
}

function apiStructuredPayload(api, dataset) {
  return {
    slug: api.slug,
    title: api.title,
    category: api.category,
    categoryId: api.categoryId,
    anchorId: api.anchorId,
    summary: api.summary,
    references: api.references,
    source: dataset.source,
    datasetGeneratedAt: dataset.generatedAt
  };
}

function resolveApi(context, identifier) {
  const key = normalize(identifier);
  if (!key) {
    return null;
  }

  if (context.aliasIndex.has(key)) {
    return context.aliasIndex.get(key);
  }

  // Attempt partial match on slug, title, or anchor ID.
  const partial = context.apis.find((api) => {
    const slug = api.slug.toLowerCase();
    const title = api.title.toLowerCase();
    const anchor = api.anchorId.toLowerCase();
    return slug.includes(key) || title.includes(key) || anchor.includes(key);
  });

  return partial ?? null;
}

function searchApis(context, query, categoryId, limit) {
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const hasTerms = terms.length > 0;
  const normalizedCategory = normalize(categoryId);

  const matches = context.apis.filter((api) => {
    if (normalizedCategory && categoryKeyFor(api) !== normalizedCategory) {
      return false;
    }
    if (!hasTerms) {
      return true;
    }
    const haystack = [
      api.slug,
      api.title,
      api.category,
      api.summary,
      api.references.map((ref) => `${ref.title} ${ref.url}`).join(' ')
    ]
      .join(' ')
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });

  return matches.slice(0, limit);
}

function registerResources(server, context) {
  // Static catalogue resource summarising all APIs by category.
  server.registerResource(
    'moodle-apis-catalog',
    'moodleapi://catalog',
    {
      title: 'Moodle 4.5 API catalogue',
      description:
        'An index of every Moodle 4.5 API entry along with category groupings and reference counts.',
      mimeType: 'application/json'
    },
    async (uri) => {
      const catalogue = context.categoryList.map((category) => ({
        id: category.id,
        title: category.title,
        totalApis: category.apis.length,
        slugs: category.apis.map((api) => api.slug)
      }));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                source: context.dataset.source,
                generatedAt: context.dataset.generatedAt,
                totalApis: context.apis.length,
                categories: catalogue
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  const apiResourceTemplate = new ResourceTemplate('moodleapi://api/{slug}', {
    list: async () => ({
      resources: context.apis.map((api) => ({
        uri: `moodleapi://api/${api.slug}`,
        name: `api-${api.slug}`,
        title: api.title,
        description: `Moodle 4.5 ${api.category} entry for ${api.title}.`,
        mimeType: 'application/json'
      }))
    }),
    complete: {
      slug: async (value) => {
        const prefix = normalize(value || '');
        return context.apis
          .map((api) => api.slug)
          .filter((slug) => !prefix || slug.startsWith(prefix))
          .slice(0, 15);
      }
    }
  });

  server.registerResource(
    'moodle-api-entry',
    apiResourceTemplate,
    {
      title: 'Individual Moodle 4.5 API entries',
      description:
        'Structured descriptions for each Moodle 4.5 API, including summary text, category and reference links.',
      mimeType: 'application/json'
    },
    async (uri, variables) => {
      const { slug } = variables;
      const api = resolveApi(context, slug);

      if (!api) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `No Moodle 4.5 API entry matches slug "${slug}".`
            }
          ]
        };
      }

      const structured = apiStructuredPayload(api, context.dataset);
      return {
        contents: [
          {
            uri: `${uri.href}#json`,
            mimeType: 'application/json',
            text: JSON.stringify(structured, null, 2)
          },
          {
            uri: `${uri.href}#markdown`,
            mimeType: 'text/markdown',
            text: formatApiMarkdown(api, context.dataset)
          }
        ]
      };
    }
  );

  const categoryTemplate = new ResourceTemplate('moodleapi://category/{categoryId}', {
    list: async () => ({
      resources: context.categoryList.map((category) => ({
        uri: `moodleapi://category/${category.id}`,
        name: `category-${category.id}`,
        title: category.title,
        description: `Contains ${category.apis.length} Moodle 4.5 API entries.`,
        mimeType: 'application/json'
      }))
    }),
    complete: {
      categoryId: async (value) => {
        const prefix = normalize(value || '');
        return context.categoryList
          .map((category) => category.id)
          .filter((id) => !prefix || id.startsWith(prefix))
          .slice(0, 10);
      }
    }
  });

  server.registerResource(
    'moodle-api-category',
    categoryTemplate,
    {
      title: 'Moodle 4.5 API categories',
      description: 'API groupings mirroring the Moodle documentation hierarchy.',
      mimeType: 'application/json'
    },
    async (uri, variables) => {
      const categoryId = normalize(variables.categoryId);
      const category = context.categories.get(categoryId);

      if (!category) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `Category "${variables.categoryId}" does not exist in the Moodle 4.5 API catalogue.`
            }
          ]
        };
      }

      const payload = {
        id: category.id,
        title: category.title,
        totalApis: category.apis.length,
        apis: category.apis.map((api) => ({
          slug: api.slug,
          title: api.title,
          summary: api.summary,
          references: api.references
        })),
        source: context.dataset.source,
        datasetGeneratedAt: context.dataset.generatedAt
      };

      return {
        contents: [
          {
            uri: `${uri.href}#json`,
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2)
          }
        ]
      };
    }
  );
}

function registerTools(server, context) {
  const toolApiSchema = apiSchema.extend({
    source: z.string(),
    datasetGeneratedAt: z.string()
  });

  const searchResultSchema = z.object({
    slug: z.string(),
    title: z.string(),
    category: z.string(),
    summary: z.string(),
    referenceCount: z.number().int().nonnegative()
  });

  server.registerTool(
    'lookup_api',
    {
      title: 'Lookup Moodle API',
      description: 'Retrieve a Moodle 4.5 API entry by slug, anchor ID, or title snippet.',
      inputSchema: {
        identifier: z.string().min(1, 'Provide a slug, anchor ID, or title to look up.')
      },
      outputSchema: {
        api: toolApiSchema
      }
    },
    async ({ identifier }) => {
      const api = resolveApi(context, identifier);

      if (!api) {
        return {
          content: [
            {
              type: 'text',
              text: `No Moodle 4.5 API entry matches "${identifier}".`
            }
          ],
          isError: true
        };
      }

      const structured = apiStructuredPayload(api, context.dataset);
      return {
        content: [
          {
            type: 'text',
            text: formatApiMarkdown(api, context.dataset)
          }
        ],
        structuredContent: {
          api: structured
        }
      };
    }
  );

  server.registerTool(
    'search_apis',
    {
      title: 'Search Moodle APIs',
      description:
        'Search Moodle 4.5 APIs by keyword and optional category filter. Results return brief summaries.',
      inputSchema: {
        query: z.string().optional(),
        categoryId: z.string().optional(),
        limit: z.number().int().min(1).max(25).optional()
      },
      outputSchema: {
        results: z.array(searchResultSchema)
      }
    },
    async ({ query = '', categoryId, limit = 10 }) => {
      const matches = searchApis(context, query, categoryId, limit);

      if (!matches.length) {
        return {
          content: [
            {
              type: 'text',
              text: 'No Moodle 4.5 APIs matched the requested filters.'
            }
          ],
          structuredContent: {
            results: []
          }
        };
      }

      const structuredResults = matches.map((api) => ({
        slug: api.slug,
        title: api.title,
        category: api.category,
        summary: api.summary,
        referenceCount: api.references.length
      }));

      const lines = structuredResults.map((result, index) => {
        const referencesLabel =
          result.referenceCount === 1
            ? '1 reference link'
            : `${result.referenceCount} reference links`;
        return `${index + 1}. ${result.title} (${result.slug}) — ${referencesLabel}`;
      });

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n')
          }
        ],
        structuredContent: {
          results: structuredResults
        }
      };
    }
  );
}

async function initialiseServer() {
  const dataset = await loadDataset();
  const pkg = await loadJson(path.join(ROOT_DIR, 'package.json'));
  const context = buildContext(dataset);

  const server = new McpServer(
    {
      name: pkg.name ?? 'moodle-mcp-server',
      title: 'Moodle 4.5 API MCP server',
      version: pkg.version ?? '0.0.0'
    },
    {
      instructions:
        'This server exposes Moodle 4.5 API documentation through structured resources.' +
        ' Use the resource catalog to discover entries, the api/{slug} template to read details,' +
        ' and tools like lookup_api or search_apis to retrieve targeted information.'
    }
  );

  registerResources(server, context);
  registerTools(server, context);

  return { server, context };
}

function parseArgs(argv) {
  const options = {
    transport: 'stdio',
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '127.0.0.1'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--transport' || arg === '-t') {
      options.transport = argv[index + 1] ?? '';
      index += 1;
    } else if (arg.startsWith('--transport=')) {
      options.transport = arg.split('=')[1] ?? '';
    } else if (arg === '--port' || arg === '-p') {
      options.port = parseInt(argv[index + 1] ?? `${options.port}`, 10);
      index += 1;
    } else if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1] ?? `${options.port}`, 10);
    } else if (arg === '--host') {
      options.host = argv[index + 1] ?? options.host;
      index += 1;
    } else if (arg.startsWith('--host=')) {
      options.host = arg.split('=')[1] ?? options.host;
    } else {
      console.warn(`[moodle-mcp] Unrecognised argument "${arg}" has been ignored.`);
    }
  }

  if (!['stdio', 'http'].includes(options.transport)) {
    throw new Error(
      `Unsupported transport "${options.transport}". Valid options are "stdio" (default) or "http".`
    );
  }

  return options;
}

function printUsage() {
  // Minimal usage banner for contributors running the server manually.
  const message = `
Moodle MCP server
Usage:
  node src/server.js [--transport=stdio|http] [--port <number>] [--host <address>]

Options:
  --transport, -t  Choose the transport. Defaults to stdio for MCP integrations.
  --port, -p       Port for the HTTP transport (default 3000 or PORT env var).
  --host           Hostname for the HTTP transport (default 127.0.0.1 or HOST env var).
  --help, -h       Display this help message.
`;
  console.log(message.trim());
}

async function startHttp(server, { port, host }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[moodle-mcp] HTTP transport error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal MCP server error.' });
      }
    }
  });

  app.all('*', (_req, res) => {
    res.status(404).json({ error: 'Unknown endpoint. Use POST /mcp for MCP requests.' });
  });

  return new Promise((resolve, reject) => {
    app
      .listen(port, host, () => {
        console.log(`[moodle-mcp] HTTP MCP server listening on http://${host}:${port}/mcp`);
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function startStdio(server) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function main() {
  try {
    const { server } = await initialiseServer();
    const options = parseArgs(process.argv.slice(2));

    if (options.transport === 'http') {
      await startHttp(server, options);
    } else {
      await startStdio(server);
    }
  } catch (error) {
    console.error('[moodle-mcp] Unable to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${__filename}`) {
  main();
}
