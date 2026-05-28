#!/usr/bin/env node

import { Command } from 'commander'
import { OpenApiParser } from './parser.js'
import { QueryEngine } from './query.js'
import { formatListing } from './formatters/listing.js'
import { formatDetail, formatParamsOnly, formatResponseOnly, formatCodesOnly } from './formatters/detail.js'
import { formatSearch } from './formatters/search.js'
import { formatSchema, formatSchemaWithBackRefs, formatSchemaNotFound } from './formatters/schema.js'
import { formatSummary } from './formatters/summary.js'
import {
  formatListingJSON, formatDetailJSON, formatSearchJSON,
  formatSchemaJSON, formatSummaryJSON
} from './formatters/json.js'

const parser = new OpenApiParser()
let query: QueryEngine | undefined

async function ensureLoaded(specPath: string): Promise<QueryEngine> {
  if (!query) {
    const opts = program.opts() as any
    await parser.load(specPath, opts.noCache)
    query = new QueryEngine(parser)
  }
  return query
}

function shouldFormatJson(commandOptions: any): boolean {
  return commandOptions.format === 'json' || program.opts().format === 'json'
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function truncateToBudget(text: string, maxTokens: number): string {
  const est = estimateTokens(text)
  if (est <= maxTokens) return text

  const result = text
  const lines = result.split('\n')

  const summaryLine = lines.slice(0, 3).join('\n')
  if (estimateTokens(summaryLine) <= maxTokens) {
    return summaryLine + `\n(truncated to ~${maxTokens} tokens)`
  }

  return `(truncated to ~${maxTokens} tokens - output too large)`
}

const program = new Command()

program
  .name('openapi-reader')
  .description('CLI tool for LLM-friendly OpenAPI document querying')
  .version('0.1.0')
  .option('--format <type>', 'Output format: text or json', 'text')
  .option('--no-cache', 'Skip cache for remote specs')

program
  .command('ls')
  .description('List all endpoints grouped by tag')
  .argument('<spec>', 'Path or URL to OpenAPI 3.0 spec')
  .option('--tag <name>', 'Filter by tag (repeatable)', (val: string, prev: string[]) => prev.concat(val), [] as string[])
  .option('--method <method>', 'Filter by HTTP method')
  .option('--deprecated', 'Show only deprecated endpoints')
  .action(async (spec: string, options: { tag?: string[]; method?: string; deprecated?: boolean }) => {
    try {
      const q = await ensureLoaded(spec)
      const endpoints = q.getEndpointSummary({
        tag: options.tag && options.tag.length > 0 ? options.tag : undefined,
        method: options.method,
        deprecated: options.deprecated || undefined,
      })

      if (shouldFormatJson(options)) {
        console.log(formatListingJSON(endpoints))
      } else {
        console.log(formatListing(endpoints))
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('get')
  .description('Get endpoint details')
  .argument('<spec>', 'Path or URL to OpenAPI 3.0 spec')
  .argument('<method>', 'HTTP method (GET, POST, PUT, DELETE, etc.)')
  .argument('<path>', 'Endpoint path (e.g., /pets)')
  .option('--params', 'Show only request parameters')
  .option('--response [code]', 'Show only response schemas, optionally filter by status code')
  .option('--codes', 'Show only HTTP status codes')
  .option('--depth <n>', 'Nested field depth (default: unlimited)', parseInt)
  .option('--max-tokens <n>', 'Approximate token budget for output', parseInt)
  .action(async (spec: string, method: string, path: string, options: {
    params?: boolean; response?: string | boolean; codes?: boolean;
    depth?: number; maxTokens?: number; format?: string
  }) => {
    try {
      const q = await ensureLoaded(spec)
      const depth = options.depth ?? -1

      if (options.params) {
        const params = q.getEndpointParams(method, path, depth)
        if (!params) { console.error(`Error: Endpoint ${method.toUpperCase()} ${path} not found`); process.exit(1) }
        const detail = q.getEndpointDetail(method, path, depth)!
        let output = formatParamsOnly(detail)
        if (options.maxTokens) output = truncateToBudget(output, options.maxTokens)
        console.log(output)
      } else if (options.response !== undefined) {
        const code = typeof options.response === 'string' ? options.response : undefined
        const responses = q.getEndpointResponses(method, path, code, depth)
        if (!responses || responses.length === 0) {
          console.error(`Error: No responses found${code ? ` for code ${code}` : ''}`)
          process.exit(1)
        }
        let output = formatResponseOnly(method, path, responses)
        if (options.maxTokens) output = truncateToBudget(output, options.maxTokens)
        console.log(output)
      } else if (options.codes) {
        const codes = q.getEndpointCodes(method, path)
        if (!codes) { console.error('Error: No codes found'); process.exit(1) }
        console.log(formatCodesOnly(method, path, codes))
      } else {
        const detail = q.getEndpointDetail(method, path, depth)
        if (!detail) { console.error(`Error: Endpoint ${method.toUpperCase()} ${path} not found`); process.exit(1) }

        if (shouldFormatJson(options)) {
          console.log(formatDetailJSON(detail))
        } else {
          let output = formatDetail(detail)
          if (options.maxTokens) output = truncateToBudget(output, options.maxTokens)
          console.log(output)
        }
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('search')
  .description('Search endpoints by keyword')
  .argument('<spec>', 'Path or URL to OpenAPI 3.0 spec')
  .argument('<keyword>', 'Search keyword')
  .action(async (spec: string, keyword: string) => {
    try {
      const q = await ensureLoaded(spec)
      const results = q.searchEndpoints(keyword)
      if (shouldFormatJson({})) {
        console.log(formatSearchJSON(results))
      } else {
        console.log(formatSearch(results, keyword))
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('schema')
  .description('View a schema/model definition')
  .argument('<spec>', 'Path or URL to OpenAPI 3.0 spec')
  .argument('<name>', 'Schema name')
  .option('--used-by', 'Show which endpoints use this schema')
  .option('--depth <n>', 'Nested field depth', parseInt)
  .action(async (spec: string, name: string, options: { usedBy?: boolean; depth?: number; format?: string }) => {
    try {
      const q = await ensureLoaded(spec)
      const depth = options.depth ?? -1
      const schema = q.getSchema(name, depth)

      if (!schema) {
        console.log(formatSchemaNotFound(name))
        process.exit(1)
      }

      if (options.usedBy) {
        const backRefs = q.getSchemaBackRefs(name)
        if (shouldFormatJson(options)) {
          console.log(formatSchemaJSON(schema, backRefs))
        } else {
          console.log(formatSchemaWithBackRefs(schema, backRefs))
        }
      } else {
        if (shouldFormatJson(options)) {
          console.log(formatSchemaJSON(schema))
        } else {
          console.log(formatSchema(schema))
        }
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('summary')
  .description('Show API overview')
  .argument('<spec>', 'Path or URL to OpenAPI 3.0 spec')
  .action(async (spec: string, options: { format?: string }) => {
    try {
      const q = await ensureLoaded(spec)
      const summary = q.getApiSummary()
      if (shouldFormatJson(options)) {
        console.log(formatSummaryJSON(summary))
      } else {
        console.log(formatSummary(summary))
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program.parse(process.argv)
