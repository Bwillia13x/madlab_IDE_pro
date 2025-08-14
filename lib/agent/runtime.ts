import { runToolCall, type ToolCall, type ToolResult } from '@/lib/agent/tools'
import { isLlmAvailable, tryLlmPlan } from '@/lib/agent/llm'

export type ChatTurn = { role: 'user' | 'agent'; content: string }

export type AgentEvent =
  | { type: 'token'; value: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; call: ToolCall; result: ToolResult }

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

// Enhanced intent parser with broader tool support
function inferToolFromText(text: string): ToolCall | null {
  const t = text.toLowerCase()

  // new sheet
  const newSheetMatch = t.match(/(?:new|create|add)\s+(valuation|charting|risk|options|blank)\s+sheet/)
  if (newSheetMatch) {
    const kind = newSheetMatch[1]
    return { name: 'add_sheet', args: { kind } }
  }

  // rename sheet
  const rn = t.match(/rename\s+(?:sheet|tab)\s+(?:to\s+)?\"?([a-z0-9 _\-]{3,40})\"?/)
  if (rn) {
    const title = rn[1].trim().replace(/\s+/g, ' ')
    return { name: 'rename_sheet', args: { title } }
  }

  // add widget with optional title
  const addWidgetWithTitle = t.match(/add\s+(?:widget\s+)?([a-z0-9\-]+)(?:\s+(?:called|named|titled)\s+\"?([^\"]+)\"?)?/)
  if (addWidgetWithTitle) {
    const type = addWidgetWithTitle[1]
    const title = addWidgetWithTitle[2]?.trim()
    return { name: 'add_widget', args: { type, ...(title && { title }) } }
  }

  // line chart for SYMBOL (RANGE)
  const lineFor = t.match(/line\s+chart\s+for\s+([a-z]{1,12})(?:\s*\((1d|5d|1m|3m|6m|1y|2y|5y|max)\))?/)
  if (lineFor) {
    const symbol = lineFor[1].toUpperCase()
    const range = (lineFor[2]?.toUpperCase() || '6M')
    return { name: 'add_widget', args: { type: 'line-chart', title: `Line: ${symbol}`, props: { symbol, range } } }
  }

  // select widget by id
  const selectWidget = t.match(/select\s+widget\s+([a-z0-9\-]+)/)
  if (selectWidget) {
    const id = selectWidget[1]
    return { name: 'select_widget', args: { id } }
  }

  // duplicate widget
  const duplicateWidget = t.match(/(?:duplicate|copy|clone)\s+widget(?:\s+([a-z0-9\-]+))?/)
  if (duplicateWidget) {
    const id = duplicateWidget[1]
    return { name: 'duplicate_widget', args: { ...(id && { id }) } }
  }

  // remove/delete widget
  const removeWidget = t.match(/(?:remove|delete)\s+widget\s+([a-z0-9\-]+)/)
  if (removeWidget) {
    const id = removeWidget[1]
    return { name: 'remove_widget', args: { id } }
  }

  // open inspector
  const openInspector = t.match(/(?:open|show)\s+inspector(?:\s+for\s+(?:widget\s+)?([a-z0-9\-]+))?/)
  if (openInspector) {
    const id = openInspector[1]
    return { name: 'open_inspector', args: { ...(id && { id }) } }
  }

  // close sheet
  if (t.match(/close\s+(?:sheet|tab)/)) {
    return { name: 'close_sheet', args: {} }
  }

  return null
}

// Parse the simple DSL ```tool { ...json... }```
function extractToolFromDsl(text: string): ToolCall | null {
  const re = /```tool\s*\n([\s\S]*?)\n```/m
  const m = text.match(re)
  if (!m) return null
  try {
    const obj = JSON.parse(m[1])
    if (obj && typeof obj.name === 'string' && typeof obj.args === 'object') {
      return { name: obj.name, args: obj.args }
    }
  } catch { /* ignore */ }
  return null
}

export async function* runAgentTurn(history: ChatTurn[]): AsyncGenerator<AgentEvent> {
  const last = history[history.length - 1]
  const userText = last?.content ?? ''

  // Enhanced tool detection
  let maybeTool = extractToolFromDsl(userText) || null
  // Prefer LLM plan when available
  if (!maybeTool && (await isLlmAvailable())) {
    maybeTool = await tryLlmPlan(userText)
  }
  if (!maybeTool) {
    maybeTool = inferToolFromText(userText)
  }

  // Context-aware preambles based on tool type
  const getPreamble = (tool: ToolCall | null): string => {
    if (!tool) return `I can help you with workspace management. `
    
    switch (tool.name) {
      case 'add_sheet':
        return `Creating a new ${tool.args.kind} sheet. `
      case 'add_widget':
        const widgetType = tool.args.type as string
        return `Adding a ${widgetType.replace(/[-_]/g, ' ')} widget${tool.args.title ? ` titled "${tool.args.title}"` : ''}. `
      case 'rename_sheet':
        return `Renaming the current sheet to "${tool.args.title}". `
      case 'select_widget':
        return `Selecting widget ${tool.args.id}. `
      case 'duplicate_widget':
        return `Duplicating widget${tool.args.id ? ` ${tool.args.id}` : ''}. `
      case 'remove_widget':
        return `Removing widget ${tool.args.id}. `
      case 'open_inspector':
        return `Opening inspector${tool.args.id ? ` for widget ${tool.args.id}` : ''}. `
      case 'close_sheet':
        return `Closing the current sheet. `
      default:
        return `Executing ${tool.name}. `
    }
  }

  const preamble = getPreamble(maybeTool)

  // Stream the preamble with variable timing for natural feel
  const tokens = preamble.split(/(\s+)/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    yield { type: 'token', value: tok }
    // Variable timing based on token type
    const isWord = /\w/.test(tok)
    const delay = isWord ? 20 + Math.random() * 15 : 5
    await sleep(delay)
  }

  if (maybeTool) {
    // Surface the tool call event
    yield { type: 'tool_call', call: maybeTool }
    
    try {
      // Execute the tool call
      const result = runToolCall(maybeTool)
      yield { type: 'tool_result', call: maybeTool, result }

      // Enhanced feedback based on result
      const tail = result.ok
        ? getSuccessMessage(maybeTool, result)
        : getErrorMessage(maybeTool, result)
      
      for (const tok of tail.split(/(\s+)/)) {
        if (!tok) continue
        yield { type: 'token', value: tok }
        await sleep(15)
      }
    } catch (error) {
      // Handle unexpected errors
      const errorResult = { 
        ok: false as const, 
        message: 'Unexpected error occurred',
        error: error instanceof Error ? error.message : String(error)
      }
      yield { type: 'tool_result', call: maybeTool, result: errorResult }
      
      for (const tok of `Error: ${errorResult.message}`.split(/(\s+)/)) {
        if (!tok) continue
        yield { type: 'token', value: tok }
        await sleep(15)
      }
    }
    return
  }

  // Enhanced fallback with more examples
  const body = `Here are some things you can ask me to do:
• "Create new valuation sheet"
• "Add widget line-chart titled Portfolio Performance"  
• "Rename sheet to Q3 Analysis"
• "Duplicate widget"
• "Open inspector"
• "Select widget [id]"`
  
  for (const tok of body.split(/(\s+)/)) {
    if (!tok) continue
    yield { type: 'token', value: tok }
    await sleep(12)
  }
}

function getSuccessMessage(tool: ToolCall, result: ToolResult): string {
  if (!result.ok) return result.message

  switch (tool.name) {
    case 'add_sheet':
      return `✓ Sheet created successfully.`
    case 'add_widget':
      return `✓ Widget added to your sheet.`
    case 'rename_sheet':
      return `✓ Sheet renamed to "${tool.args.title}".`
    case 'duplicate_widget':
      return `✓ Widget duplicated successfully.`
    case 'open_inspector':
      return `✓ Inspector opened for widget properties.`
    default:
      return `✓ ${result.message}`
  }
}

function getErrorMessage(tool: ToolCall, result: ToolResult): string {
  if (result.ok) return result.message

  // Add helpful context for common errors
  const message = result.message
  switch (tool.name) {
    case 'remove_widget':
    case 'close_sheet':
      return `⚠️ ${message} This action requires confirmation for safety.`
    case 'select_widget':
      return `⚠️ ${message} Make sure the widget ID exists in the current sheet.`
    case 'duplicate_widget':
      return `⚠️ ${message} Try selecting a widget first, then duplicate it.`
    default:
      return `⚠️ ${message}`
  }
}
