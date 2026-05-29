#!/usr/bin/env node

import { Command } from 'commander'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OpenApiParser } from './parser.js'
import { QueryEngine } from './query.js'
import { formatListingHuman, formatListingBriefHuman } from './formatters/listing.js'
import { formatDetailHuman, formatParamsOnlyHuman, formatResponseOnlyHuman } from './formatters/detail.js'
import { formatSearchAllHuman } from './formatters/search.js'
import { formatSchemaWithBackRefsHuman, formatSchemaNotFound } from './formatters/schema.js'
import {
  formatListingLLM, formatListingBriefLLM, formatDetailLLM, formatParamsOnlyLLM, formatResponseOnlyLLM,
  formatSearchAllLLM, formatSchemaWithBackRefsLLM
} from './formatters/llm.js'
import {
  formatListingJSON, formatDetailJSON,
  formatSearchAllJSON, formatSchemaJSON
} from './formatters/json.js'

function resolveSpecPath(arg?: string): string {
  if (arg) return arg
  const env = process.env.OPENAPI_READER_SPEC
  if (env) return env
  const candidates = ['.openapi-reader.json', 'openapi-reader.json']
  for (const f of candidates) {
    const p = join(process.cwd(), f)
    if (existsSync(p)) {
      try {
        const cfg = JSON.parse(readFileSync(p, 'utf-8'))
        if (cfg.spec) return cfg.spec
      } catch {
      // ignore parse errors, fall through
    }
    }
  }
  console.error('Error: No spec provided. Pass a spec path, set OPENAPI_READER_SPEC, or create .openapi-reader.json with {"spec": "..."}')
  process.exit(1)
}

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
  .argument('[spec]', 'Path or URL to OpenAPI 3.0 spec')
  .option('--tag <name>', 'Filter by tag (repeatable)', (val: string, prev: string[]) => prev.concat(val), [] as string[])
  .option('--path <keyword>', 'Filter by path (fuzzy match)')
  .option('--method <method>', 'Filter by HTTP method')
  .option('--deprecated', 'Show only deprecated endpoints')
  .option('--brief', 'Show method and path only (no descriptions)')
  .action(async (spec: string | undefined, options: { tag?: string[]; path?: string; method?: string; deprecated?: boolean; brief?: boolean }) => {
    try {
      const q = await ensureLoaded(resolveSpecPath(spec))

      const endpoints = q.getEndpointSummary({
        tag: options.tag && options.tag.length > 0 ? options.tag : undefined,
        url: options.path,
        method: options.method,
        deprecated: options.deprecated || undefined,
      })

      const summary = q.getApiSummary()
      const fmt = getFormatterType(options)
      let listingOutput: string
      if (options.brief) {
        listingOutput = fmt === 'human' ? formatListingBriefHuman(endpoints) : formatListingBriefLLM(endpoints)
      } else if (fmt === 'json') {
        console.log(formatListingJSON(endpoints))
        return
      } else if (fmt === 'human') {
        listingOutput = formatListingHuman(endpoints)
      } else {
        listingOutput = formatListingLLM(endpoints)
      }

      const headerItems = [
        `${summary.title} v${summary.version}`,
        `${summary.endpoints} endpoints`,
        `Auth: ${summary.auth}`,
        summary.servers.length > 0 ? summary.servers.join(', ') : null,
      ].filter(Boolean).join(' | ')
      console.log(`${headerItems}\n${listingOutput}`)
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('get')
  .description('Get endpoint details')
  .argument('[spec]', 'Path or URL to OpenAPI 3.0 spec')
  .argument('[method]', 'HTTP method (GET, POST, etc.). Omit to list all methods on the path.')
  .argument('[path]', 'Endpoint path (e.g., /pets). Supports fuzzy matching if exact path not found.')
  .option('--params', 'Show only request parameters')
  .option('--response [code]', 'Show only response schemas, optionally filter by status code')
  .option('--depth <n>', 'Nested field depth (default: unlimited)', parseInt)
  .action(async (spec: string | undefined, method: string | undefined, path: string | undefined, options: {
    params?: boolean; response?: string | boolean;
    depth?: number; format?: string
  }) => {
    try {
      const resolvedSpec = resolveSpecPath(spec)
      const q = await ensureLoaded(resolvedSpec)
      const depth = options.depth ?? -1
      const fmt = getFormatterType(options)

      const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE']
      const isSpecProvided = spec !== undefined && (spec.startsWith('http://') || spec.startsWith('https://') || spec.endsWith('.yaml') || spec.endsWith('.yml') || spec.endsWith('.json') || spec.includes('/') && !spec.startsWith('/'))
      let resolvedMethod = method
      let resolvedPath = path
      if (!isSpecProvided && spec) {
        resolvedMethod = spec
        resolvedPath = method
      }

      if (!resolvedMethod) {
        console.error('Error: Specify a path, e.g. get /pets or get GET /pets')
        process.exit(1)
      }

      const upperMethod = resolvedMethod.toUpperCase()

      if (!resolvedPath) {
        const inputPath = resolvedMethod.startsWith('/') ? resolvedMethod : `/${resolvedMethod}`
        const matches = q.getMatchingEndpoints(inputPath)
        if (matches.length === 0) {
          console.error(`Error: No endpoints match "${inputPath}"`)
          process.exit(1)
        }
        const pathGroup = new Map<string, typeof matches>()
        for (const m of matches) {
          if (!pathGroup.has(m.path)) pathGroup.set(m.path, [])
          pathGroup.get(m.path)!.push(m)
        }
        if (pathGroup.size === 1) {
          const [matchedPath, eps] = pathGroup.entries().next().value!
          if (eps.length === 1) {
            showEndpoint(q, eps[0].method, matchedPath, depth, options, fmt)
          } else {
            showMultiEndpoints(q, eps, matchedPath, depth, options, fmt)
          }
        } else {
          for (const [matchedPath, eps] of pathGroup) {
            for (const ep of eps) {
              console.log(`${ep.method} ${matchedPath}`)
            }
          }
          console.error(`\nMultiple paths match "${inputPath}". Specify the full path.`)
          process.exit(1)
        }
        return
      }

      const detail = q.getEndpointDetail(upperMethod, resolvedPath)
      if (detail) {
        showEndpoint(q, upperMethod, resolvedPath, depth, options, fmt)
        return
      }

      if (httpMethods.includes(upperMethod)) {
        const allOnPath = q.getEndpointPathsMatching(resolvedPath)
        if (allOnPath.length > 0) {
          if (allOnPath.length === 1) {
            if (allOnPath[0].methods.length === 1) {
              showEndpoint(q, allOnPath[0].methods[0], allOnPath[0].path, depth, options, fmt)
            } else if (allOnPath[0].methods.includes(upperMethod)) {
              showEndpoint(q, upperMethod, allOnPath[0].path, depth, options, fmt)
            } else {
              for (const m of allOnPath[0].methods) {
                console.log(`${m} ${allOnPath[0].path}`)
              }
              console.error(`\n${upperMethod} ${resolvedPath} not found. Available on ${allOnPath[0].path}: ${allOnPath[0].methods.join(', ')}`)
              process.exit(1)
            }
          } else {
            for (const p of allOnPath) {
              for (const m of p.methods) {
                console.log(`${m} ${p.path}`)
              }
            }
            console.error(`\n${upperMethod} ${resolvedPath} not found. Did you mean one of the above?`)
            process.exit(1)
          }
        } else {
          const suggestions = q.getMatchingEndpoints(resolvedPath)
          if (suggestions.length > 0) {
            console.error(`Endpoint ${upperMethod} ${resolvedPath} not found. Similar paths:`)
            for (const s of suggestions) {
              console.error(`  ${s.method} ${s.path}${s.summary ? '  ' + s.summary : ''}`)
            }
          } else {
            console.error(`Error: Endpoint ${upperMethod} ${resolvedPath} not found`)
          }
          process.exit(1)
        }
      } else {
        const inputPath = resolvedMethod.startsWith('/') ? resolvedMethod : `/${resolvedMethod}`
        const matches = q.getMatchingEndpoints(inputPath)
        if (matches.length === 0) {
          console.error(`Error: No endpoints match "${inputPath}"`)
          process.exit(1)
        }
        const pathGroup = new Map<string, typeof matches>()
        for (const m of matches) {
          if (!pathGroup.has(m.path)) pathGroup.set(m.path, [])
          pathGroup.get(m.path)!.push(m)
        }
        if (pathGroup.size === 1) {
          const [matchedPath, eps] = pathGroup.entries().next().value!
          if (eps.length === 1) {
            showEndpoint(q, eps[0].method, matchedPath, depth, options, fmt)
          } else {
            showMultiEndpoints(q, eps, matchedPath, depth, options, fmt)
          }
        } else {
          for (const [matchedPath, eps] of pathGroup) {
            for (const ep of eps) {
              console.log(`${ep.method} ${matchedPath}`)
            }
          }
          console.error(`\nMultiple paths match "${inputPath}". Specify the full path.`)
          process.exit(1)
        }
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

function hasResponses(q: QueryEngine, method: string, path: string, code: string | undefined, depth: number): boolean {
  const responses = q.getEndpointResponses(method, path, code, depth)
  return responses ? responses.length > 0 : false
}

function showEndpoint(q: QueryEngine, method: string, path: string, depth: number, options: any, fmt: FormatType) {
  if (options.params) {
    const params = q.getEndpointParams(method, path, depth)
    if (!params) { console.error(`Error: Endpoint ${method} ${path} not found`); process.exit(1) }
    const detail = q.getEndpointDetail(method, path, depth)!
    console.log(fmt === 'llm' ? formatParamsOnlyLLM(detail) : formatParamsOnlyHuman(detail))
  } else if (options.response !== undefined) {
    const code = typeof options.response === 'string' ? options.response : undefined
    const responses = q.getEndpointResponses(method, path, code, depth)
    if (!responses || responses.length === 0) {
      console.error(`Error: No responses found${code ? ` for code ${code}` : ''}`)
      process.exit(1)
    }
    console.log(fmt === 'llm' ? formatResponseOnlyLLM(method, path, responses) : formatResponseOnlyHuman(method, path, responses))
  } else {
    const detail = q.getEndpointDetail(method, path, depth)
    if (!detail) { console.error(`Error: Endpoint ${method} ${path} not found`); process.exit(1) }

    if (fmt === 'json') {
      console.log(formatDetailJSON(detail))
    } else if (fmt === 'human') {
      console.log(formatDetailHuman(detail))
    } else {
      console.log(formatDetailLLM(detail))
    }
  }
}

function showMultiEndpoints(
  q: QueryEngine,
  eps: { method: string; path: string }[],
  path: string,
  depth: number,
  options: any,
  fmt: FormatType
) {
  if (options.response !== undefined) {
    const code = typeof options.response === 'string' ? options.response : undefined
    const filtered = eps.filter(ep => hasResponses(q, ep.method, path, code, depth))
    if (filtered.length === 0) {
      console.error(`Error: No responses found${code ? ` for code ${code}` : ''}`)
      process.exit(1)
    }
    for (const ep of filtered) {
      showEndpoint(q, ep.method, path, depth, options, fmt)
    }
    return
  }
  for (const ep of eps) {
    showEndpoint(q, ep.method, path, depth, options, fmt)
  }
}

program
  .command('search')
  .description('Search endpoints, schemas, and fields by keyword')
  .argument('[spec]', 'Path or URL to OpenAPI 3.0 spec')
  .argument('[keyword]', 'Search keyword')
  .action(async (spec: string | undefined, keyword: string | undefined) => {
    try {
      let resolvedSpec: string
      let resolvedKeyword: string
      const isSpecLike = spec ? (spec.startsWith('http://') || spec.startsWith('https://') || spec.endsWith('.yaml') || spec.endsWith('.yml') || spec.endsWith('.json')) : false
      if (keyword) {
        resolvedSpec = resolveSpecPath(spec)
        resolvedKeyword = keyword
      } else if (spec && !isSpecLike) {
        resolvedSpec = resolveSpecPath(undefined)
        resolvedKeyword = spec
      } else {
        console.error('Error: Search keyword is required')
        process.exit(1)
      }
      const q = await ensureLoaded(resolvedSpec)
      const endpoints = q.searchEndpoints(resolvedKeyword)
      const schemaFields = q.searchFields(resolvedKeyword)
      const endpointFields = q.searchEndpointFields(resolvedKeyword)
      const fmt = getFormatterType({})
      if (fmt === 'json') {
        console.log(formatSearchAllJSON(endpoints, schemaFields, endpointFields))
      } else if (fmt === 'human') {
        console.log(formatSearchAllHuman(endpoints, resolvedKeyword, schemaFields, endpointFields))
      } else {
        console.log(formatSearchAllLLM(endpoints, resolvedKeyword, schemaFields, endpointFields))
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('schema')
  .description('View a schema/model definition')
  .argument('[spec]', 'Path or URL to OpenAPI 3.0 spec')
  .argument('[name]', 'Schema name')
  .option('--depth <n>', 'Nested field depth', parseInt)
  .action(async (spec: string | undefined, name: string | undefined, options: { depth?: number; format?: string }) => {
    try {
      const q = await ensureLoaded(resolveSpecPath(spec))

      if (!name) {
        const schemas = q.getSchemaList()
        const fmt = getFormatterType(options)
        if (fmt === 'json') {
          console.log(JSON.stringify(schemas, null, 2))
        } else {
          for (const s of schemas) {
            const desc = s.description ? `  ${s.description}` : ''
            console.log(`${s.name}${desc}`)
          }
        }
        return
      }

      const depth = options.depth ?? -1
      const schema = q.getSchema(name, depth)

      if (!schema) {
        console.log(formatSchemaNotFound(name))
        process.exit(1)
      }

      const fmt = getFormatterType(options)
      const backRefs = q.getSchemaBackRefs(name)

      if (fmt === 'json') {
        console.log(formatSchemaJSON(schema, backRefs))
      } else if (fmt === 'human') {
        console.log(formatSchemaWithBackRefsHuman(schema, backRefs))
      } else {
        console.log(formatSchemaWithBackRefsLLM(schema, backRefs))
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

  return argv
}

program.parse(prepareArgv(process.argv))
