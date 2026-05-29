#!/usr/bin/env node

import { Command } from 'commander'
import { OpenApiParser } from './parser.js'
import { QueryEngine } from './query.js'
import { formatListingHuman } from './formatters/listing.js'
import { formatDetailHuman, formatParamsOnlyHuman, formatResponseOnlyHuman, formatCodesOnlyHuman } from './formatters/detail.js'
import { formatSearchHuman } from './formatters/search.js'
import { formatSchemaHuman, formatSchemaWithBackRefsHuman, formatSchemaNotFound } from './formatters/schema.js'
import { formatSummaryHuman } from './formatters/summary.js'
import {
  formatListingLLM, formatDetailLLM, formatParamsOnlyLLM, formatResponseOnlyLLM, formatCodesOnlyLLM,
  formatSearchLLM, formatSchemaLLM, formatSchemaWithBackRefsLLM, formatSummaryLLM
} from './formatters/llm.js'
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

type FormatType = 'llm' | 'human' | 'json'

function getFormatterType(commandOptions: any): FormatType {
  const fmt = commandOptions.format || program.opts().format
  if (fmt === 'json') return 'json'
  if (fmt === 'text' || fmt === 'human') return 'human'
  return 'llm'
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
  .option('--format <type>', 'Output format: llm, human (or text), json', 'llm')
  .option('--no-cache', 'Skip cache for remote specs')

program
  .command('ls')
  .description('List all endpoints grouped by tag')
  .argument('<spec>', 'Path or URL to OpenAPI 3.0 spec')
  .option('--tag <name>', 'Filter by tag (repeatable)', (val: string, prev: string[]) => prev.concat(val), [] as string[])
  .option('--url <keyword>', 'Filter by URL path (fuzzy match)')
  .option('--method <method>', 'Filter by HTTP method')
  .option('--deprecated', 'Show only deprecated endpoints')
  .action(async (spec: string, options: { tag?: string[]; url?: string; method?: string; deprecated?: boolean }) => {
    try {
      const q = await ensureLoaded(spec)
      const endpoints = q.getEndpointSummary({
        tag: options.tag && options.tag.length > 0 ? options.tag : undefined,
        url: options.url,
        method: options.method,
        deprecated: options.deprecated || undefined,
      })

      const fmt = getFormatterType(options)
      if (fmt === 'json') {
        console.log(formatListingJSON(endpoints))
      } else if (fmt === 'human') {
        console.log(formatListingHuman(endpoints))
      } else {
        console.log(formatListingLLM(endpoints))
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

      const fmt = getFormatterType(options)

      if (options.params) {
        const params = q.getEndpointParams(method, path, depth)
        if (!params) { console.error(`Error: Endpoint ${method.toUpperCase()} ${path} not found`); process.exit(1) }
        const detail = q.getEndpointDetail(method, path, depth)!
        let output = fmt === 'llm' ? formatParamsOnlyLLM(detail) : formatParamsOnlyHuman(detail)
        if (options.maxTokens) output = truncateToBudget(output, options.maxTokens)
        console.log(output)
      } else if (options.response !== undefined) {
        const code = typeof options.response === 'string' ? options.response : undefined
        const responses = q.getEndpointResponses(method, path, code, depth)
        if (!responses || responses.length === 0) {
          console.error(`Error: No responses found${code ? ` for code ${code}` : ''}`)
          process.exit(1)
        }
        let output = fmt === 'llm' ? formatResponseOnlyLLM(method, path, responses) : formatResponseOnlyHuman(method, path, responses)
        if (options.maxTokens) output = truncateToBudget(output, options.maxTokens)
        console.log(output)
      } else if (options.codes) {
        const codes = q.getEndpointCodes(method, path)
        if (!codes) { console.error('Error: No codes found'); process.exit(1) }
        console.log(fmt === 'llm' ? formatCodesOnlyLLM(method, path, codes) : formatCodesOnlyHuman(method, path, codes))
      } else {
        const detail = q.getEndpointDetail(method, path, depth)
        if (!detail) { console.error(`Error: Endpoint ${method.toUpperCase()} ${path} not found`); process.exit(1) }

        if (fmt === 'json') {
          console.log(formatDetailJSON(detail))
        } else if (fmt === 'human') {
          let output = formatDetailHuman(detail)
          if (options.maxTokens) output = truncateToBudget(output, options.maxTokens)
          console.log(output)
        } else {
          let output = formatDetailLLM(detail)
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
      const fmt = getFormatterType({})
      if (fmt === 'json') {
        console.log(formatSearchJSON(results))
      } else if (fmt === 'human') {
        console.log(formatSearchHuman(results, keyword))
      } else {
        console.log(formatSearchLLM(results, keyword))
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

      const fmt = getFormatterType(options)

      if (options.usedBy) {
        const backRefs = q.getSchemaBackRefs(name)
        if (fmt === 'json') {
          console.log(formatSchemaJSON(schema, backRefs))
        } else if (fmt === 'human') {
          console.log(formatSchemaWithBackRefsHuman(schema, backRefs))
        } else {
          console.log(formatSchemaWithBackRefsLLM(schema, backRefs))
        }
      } else {
        if (fmt === 'json') {
          console.log(formatSchemaJSON(schema))
        } else if (fmt === 'human') {
          console.log(formatSchemaHuman(schema))
        } else {
          console.log(formatSchemaLLM(schema))
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
      const fmt = getFormatterType(options)
      if (fmt === 'json') {
        console.log(formatSummaryJSON(summary))
      } else if (fmt === 'human') {
        console.log(formatSummaryHuman(summary))
      } else {
        console.log(formatSummaryLLM(summary))
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

const knownCommands = new Set(program.commands.map(c => c.name()))

const valueOptions = new Set(
  program.options
    .filter(o => o.required || o.optional)
    .map(o => o.long || o.short)
    .filter(Boolean) as string[]
)

function prepareArgv(argv: string[]): string[] {
  let firstPosIdx = -1
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('-')) {
      firstPosIdx = i
      break
    }
    if (valueOptions.has(arg) && i + 1 < argv.length) {
      i++
    }
  }
  if (firstPosIdx < 0) return argv

  if (knownCommands.has(argv[firstPosIdx])) return argv

  let cmdIdx = -1
  for (let i = firstPosIdx + 1; i < argv.length; i++) {
    if (!argv[i].startsWith('-') && knownCommands.has(argv[i])) {
      cmdIdx = i
      break
    }
  }

  if (cmdIdx >= 0) {
    const newArgv = [...argv]
    const cmd = newArgv.splice(cmdIdx, 1)[0]
    newArgv.splice(firstPosIdx, 0, cmd)
    return newArgv
  }

  const newArgv = [...argv]
  newArgv.splice(firstPosIdx, 0, 'summary')
  return newArgv
}

program.parse(prepareArgv(process.argv))
