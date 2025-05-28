const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { getApiKey } = require('./credentials');

function createKagiSearchTool(fields = {}) {
  const envVar = 'KAGI_API_KEY';
  const override = fields.override ?? false;
  const apiKey = fields.apiKey ?? getApiKey(envVar, override);
  const kwargs = fields?.kwargs ?? {};

  return tool(
    async (input) => {
      const { query, limit = 10, ...rest } = input;

      const url = new URL('https://kagi.com/api/v0/search');
      url.searchParams.set('q', query);
      if (limit) {
        url.searchParams.set('limit', limit.toString());
      }

      // Add any additional parameters from kwargs or rest
      Object.entries({ ...rest, ...kwargs }).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value.toString());
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bot ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kagi API request failed with status ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      return JSON.stringify(json);
    },
    {
      name: 'kagi_search',
      description:
        'Search the web using Kagi Search API. Provides high-quality, ad-free search results with privacy protection.',
      schema: z.object({
        query: z.string().min(1).describe('The search query string.'),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum number of search result objects to return. Defaults to 10.'),
      }),
    },
  );
}

module.exports = createKagiSearchTool;