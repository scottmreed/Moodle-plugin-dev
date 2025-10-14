#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

async function main() {
  const client = new Client(
    {
      name: 'moodle-mcp-smoke-client',
      version: '0.1.0'
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/server.js', '--transport=stdio'],
    cwd: ROOT_DIR,
    stderr: 'pipe'
  });

  const stderr = transport.stderr;
  if (stderr) {
    stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
  }

  await client.connect(transport);

  const serverInfo = client.getServerVersion();
  console.log('Connected to', serverInfo?.name ?? 'unknown server', serverInfo?.version ?? '');

  const instructions = client.getInstructions();
  if (instructions) {
    console.log('\nServer instructions:\n', instructions, '\n');
  }

  const resources = await client.listResources({});
  console.log('Static resources:', resources.resources.map((resource) => resource.uri));

  const resourceTemplates = await client.listResourceTemplates({});
  console.log(
    'Resource templates:',
    resourceTemplates.resourceTemplates.map((template) => template.uriTemplate)
  );

  const tools = await client.listTools({});
  console.log('Tools:', tools.tools.map((tool) => tool.name));

  await client.close();
}

main().catch((error) => {
  console.error('[verify-mcp] Verification failed:', error);
  process.exit(1);
});
