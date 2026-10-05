export interface AgentNode {
  id: string
  icon: string
  label: string
  desc: string
  type: 'trigger' | 'processor' | 'analyzer' | 'generator' | 'notifier' | 'evaluator'
  color: string
}

export interface ParsedIntent {
  nodes: AgentNode[]
  detectedTools: string[]
  summary: string
}

const TOOL_KEYWORDS: Record<string, string[]> = {
  'Google Drive':  ['google drive', 'gdrive', 'drive'],
  'Gmail':         ['gmail', 'email', 'send email', 'mail'],
  'Slack':         ['slack'],
  'Discord':       ['discord'],
  'GitHub':        ['github', 'git', 'repo', 'pull request'],
  'PDF':           ['pdf', 'document'],
  'Web Search':    ['search', 'web search', 'browse', 'scrape', 'internet'],
  'Database':      ['database', 'postgres', 'sql', 'supabase'],
  'Twitter/X':     ['twitter', 'tweet'],
  'Notion':        ['notion'],
  'S3':            ['s3', 'bucket', 'file storage'],
  'Scheduler':     ['daily', 'weekly', 'schedule', 'cron', 'every day', 'every hour'],
  'Vector DB':     ['vector', 'embedding', 'rag', 'semantic search', 'knowledge base'],
  'YouTube':       ['youtube', 'video', 'transcript'],
  'Spreadsheet':   ['spreadsheet', 'excel', 'google sheets', 'csv'],
  'Webhook':       ['webhook', 'api call', 'rest api'],
}

export function detectTools(prompt: string): string[] {
  const lower = prompt.toLowerCase()
  return Object.entries(TOOL_KEYWORDS)
    .filter(([, kws]) => kws.some(k => lower.includes(k)))
    .map(([tool]) => tool)
}

export function parseIntent(prompt: string): ParsedIntent {
  const lower = prompt.toLowerCase()
  const tools = detectTools(prompt)
  const nodes: AgentNode[] = []

  // 1. Trigger / Monitor
  if (tools.includes('Scheduler') || lower.includes('monitor') || lower.includes('watch')) {
    nodes.push({ id: 'n1', icon: '⏰', label: 'Monitor Agent', type: 'trigger', color: 'border-accent-cyan/40 bg-accent-cyan/5', desc: 'Watches for new events and triggers the workflow on schedule' })
  } else {
    nodes.push({ id: 'n1', icon: '⚡', label: 'Trigger Agent', type: 'trigger', color: 'border-accent-cyan/40 bg-accent-cyan/5', desc: 'Listens for incoming requests and kicks off the pipeline' })
  }

  // 2. Data extraction if there's a source
  if (tools.some(t => ['Google Drive', 'PDF', 'YouTube', 'Spreadsheet', 'S3'].includes(t)) || lower.includes('read') || lower.includes('fetch')) {
    const src = tools.find(t => ['Google Drive', 'PDF', 'YouTube', 'Spreadsheet', 'S3'].includes(t)) || 'source'
    nodes.push({ id: 'n2', icon: '📥', label: 'Data Extraction Agent', type: 'processor', color: 'border-brand-500/40 bg-brand-500/5', desc: `Pulls and parses raw data from ${src}` })
  }

  // 3. Research if web search
  if (tools.includes('Web Search') || lower.includes('research') || lower.includes('find information')) {
    nodes.push({ id: 'n3', icon: '🔍', label: 'Research Agent', type: 'processor', color: 'border-brand-500/40 bg-brand-500/5', desc: 'Searches the web and gathers relevant context' })
  }

  // 4. Code agent
  if (lower.includes('code') || lower.includes('bug') || lower.includes('review') || lower.includes('fix')) {
    nodes.push({ id: 'n4', icon: '💻', label: 'Code Agent', type: 'generator', color: 'border-accent-purple/40 bg-accent-purple/5', desc: 'Writes, reviews, and fixes code automatically' })
  }

  // 5. Classifier
  if (lower.includes('classif') || lower.includes('categor') || lower.includes('route') || lower.includes('triage')) {
    nodes.push({ id: 'n5', icon: '🏷️', label: 'Classification Agent', type: 'processor', color: 'border-brand-500/40 bg-brand-500/5', desc: 'Categorizes and routes data to the right pipeline branch' })
  }

  // 6. Analysis — always
  nodes.push({ id: 'n6', icon: '🧠', label: 'Analysis Agent', type: 'analyzer', color: 'border-accent-purple/40 bg-accent-purple/5', desc: 'Understands context, finds patterns, extracts key insights' })

  // 7. Summary or Writer
  if (lower.includes('summar') || lower.includes('report') || lower.includes('brief')) {
    nodes.push({ id: 'n7', icon: '📝', label: 'Summary Agent', type: 'generator', color: 'border-accent-purple/40 bg-accent-purple/5', desc: 'Generates a structured, human-readable summary' })
  } else if (lower.includes('write') || lower.includes('draft') || lower.includes('generat') || lower.includes('creat') || lower.includes('post')) {
    nodes.push({ id: 'n7', icon: '✍️', label: 'Writer Agent', type: 'generator', color: 'border-accent-purple/40 bg-accent-purple/5', desc: 'Generates polished, structured written content' })
  }

  // 8. Evaluator
  nodes.push({ id: 'n8', icon: '✅', label: 'Quality Evaluator', type: 'evaluator', color: 'border-accent-amber/40 bg-accent-amber/5', desc: 'Checks output quality and retries if below threshold' })

  // 9. Notifier — always last, customised by destination
  let notifierDesc = 'Delivers the final output to the right destination'
  if (tools.includes('Slack'))   notifierDesc = 'Posts the result to your Slack channel'
  if (tools.includes('Discord')) notifierDesc = 'Posts the result to your Discord channel'
  if (tools.includes('Gmail'))   notifierDesc = 'Sends the result via email'
  if (tools.includes('GitHub'))  notifierDesc = 'Opens a PR or posts a comment on GitHub'
  if (tools.includes('Notion'))  notifierDesc = 'Saves the result to a Notion page'
  nodes.push({ id: 'n9', icon: '📤', label: 'Notification Agent', type: 'notifier', color: 'border-accent-emerald/40 bg-accent-emerald/5', desc: notifierDesc })

  // Re-index IDs
  const indexed = nodes.map((n, i) => ({ ...n, id: `n${i + 1}` }))
  const toolStr = tools.length > 0 ? ` integrating ${tools.slice(0, 3).join(', ')}` : ''
  const summary = `I've designed a ${indexed.length}-agent pipeline${toolStr} based on your prompt. Click any agent to configure it.`

  return { nodes: indexed, detectedTools: tools, summary }
}

export interface FileNode {
  name: string
  type: 'folder' | 'file'
  indent: number
  desc: string
  active?: boolean
}

export function buildFileTree(prompt: string, framework: string): FileNode[] {
  const lower = prompt.toLowerCase()
  const tools = detectTools(prompt)

  const hasPDF      = tools.includes('PDF')
  const hasDrive    = tools.includes('Google Drive')
  const hasSlack    = tools.includes('Slack')
  const hasDiscord  = tools.includes('Discord')
  const hasEmail    = tools.includes('Gmail')
  const hasSearch   = tools.includes('Web Search')
  const hasDB       = tools.includes('Database') || tools.includes('Vector DB')
  const hasSchedule = tools.includes('Scheduler')
  const hasGitHub   = tools.includes('GitHub')
  const hasYT       = tools.includes('YouTube')

  const base: FileNode[] = [
    { name: 'src/', type: 'folder', indent: 0, desc: 'Main source directory' },
  ]

  // Framework-specific entry point
  if (framework === 'langgraph') {
    base.push({ name: 'graph.py', type: 'file', indent: 1, active: true, desc: 'LangGraph StateGraph definition — nodes, edges, and conditional routing' })
    base.push({ name: 'state.py', type: 'file', indent: 1, desc: 'TypedDict state schema shared across all graph nodes' })
    base.push({ name: 'nodes/', type: 'folder', indent: 1, desc: 'Individual graph node functions' })
    base.push({ name: 'planner.py', type: 'file', indent: 2, desc: 'Breaks the task into subtasks and decides execution order' })
    if (hasSearch) base.push({ name: 'researcher.py', type: 'file', indent: 2, desc: 'Web search and content extraction node' })
    if (hasPDF || hasDrive || hasYT) base.push({ name: 'extractor.py', type: 'file', indent: 2, desc: `Extracts content from ${hasPDF ? 'PDF' : hasDrive ? 'Google Drive' : 'YouTube'}` })
    base.push({ name: 'analyzer.py', type: 'file', indent: 2, desc: 'Core reasoning node — Claude-powered analysis' })
    base.push({ name: 'evaluator.py', type: 'file', indent: 2, desc: 'Quality check — retries if output score < threshold' })
  } else if (framework === 'crewai') {
    base.push({ name: 'crew.py', type: 'file', indent: 1, active: true, desc: 'Crew definition — assembles agents and kicks off tasks' })
    base.push({ name: 'agents.py', type: 'file', indent: 1, desc: 'Agent role definitions with goals and backstories' })
    base.push({ name: 'tasks.py', type: 'file', indent: 1, desc: 'Task definitions assigned to each agent' })
  } else if (framework === 'pydanticai') {
    base.push({ name: 'agent.py', type: 'file', indent: 1, active: true, desc: 'PydanticAI Agent with typed deps and result models' })
    base.push({ name: 'models.py', type: 'file', indent: 1, desc: 'Pydantic output models for structured responses' })
    base.push({ name: 'deps.py', type: 'file', indent: 1, desc: 'Dependency injection container for the agent' })
  } else if (framework === 'autogen') {
    base.push({ name: 'agents.py', type: 'file', indent: 1, active: true, desc: 'AssistantAgent and UserProxyAgent configuration' })
    base.push({ name: 'groupchat.py', type: 'file', indent: 1, desc: 'GroupChat manager for multi-agent conversations' })
    base.push({ name: 'config.py', type: 'file', indent: 1, desc: 'LLM config list and termination conditions' })
  } else {
    base.push({ name: 'orchestrator.py', type: 'file', indent: 1, active: true, desc: 'Custom async orchestration loop' })
    base.push({ name: 'agents/', type: 'folder', indent: 1, desc: 'Individual agent classes' })
    base.push({ name: 'base_agent.py', type: 'file', indent: 2, desc: 'Abstract base class all agents inherit from' })
  }

  // Tools directory — only if integrations detected
  const toolFiles: FileNode[] = []
  if (hasSearch)   toolFiles.push({ name: 'web_search.py',   type: 'file', indent: 2, desc: 'DuckDuckGo / Tavily web search wrapper' })
  if (hasPDF)      toolFiles.push({ name: 'pdf_reader.py',   type: 'file', indent: 2, desc: 'PyMuPDF-based PDF text extraction' })
  if (hasDrive)    toolFiles.push({ name: 'gdrive.py',       type: 'file', indent: 2, desc: 'Google Drive API — list and download files' })
  if (hasSlack)    toolFiles.push({ name: 'slack.py',        type: 'file', indent: 2, desc: 'Slack Web API — post messages to channels' })
  if (hasDiscord)  toolFiles.push({ name: 'discord.py',      type: 'file', indent: 2, desc: 'Discord webhook — send formatted messages' })
  if (hasEmail)    toolFiles.push({ name: 'email.py',        type: 'file', indent: 2, desc: 'SMTP email sender with HTML template support' })
  if (hasDB)       toolFiles.push({ name: 'vector_store.py', type: 'file', indent: 2, desc: 'Supabase pgvector — upsert and similarity search' })
  if (hasGitHub)   toolFiles.push({ name: 'github.py',       type: 'file', indent: 2, desc: 'GitHub API — create PRs and post comments' })
  if (hasYT)       toolFiles.push({ name: 'youtube.py',      type: 'file', indent: 2, desc: 'YouTube transcript extraction via yt-dlp' })
  if (hasSchedule) toolFiles.push({ name: 'scheduler.py',    type: 'file', indent: 2, desc: 'APScheduler cron job — triggers workflow on schedule' })

  if (toolFiles.length > 0) {
    base.push({ name: 'tools/', type: 'folder', indent: 1, desc: 'External integrations and utility wrappers' })
    base.push(...toolFiles)
  }

  base.push({ name: 'main.py', type: 'file', indent: 1, desc: 'Entry point — initialises and runs the agent pipeline' })

  // Config files
  base.push({ name: 'lyzr.config.json', type: 'file', indent: 0, desc: 'Lyzr Studio deployment config — agents, workflow, model settings' })
  base.push({ name: 'Dockerfile', type: 'file', indent: 0, desc: 'Container image — Python 3.11 slim, installs deps, runs main.py' })
  base.push({ name: 'requirements.txt', type: 'file', indent: 0, desc: `Core deps: ${framework}, langchain-aws, boto3${hasSlack ? ', slack-sdk' : ''}${hasPDF ? ', pymupdf' : ''}${hasDB ? ', supabase' : ''}` })
  if (lower.includes('test') || lower.includes('review')) {
    base.push({ name: 'tests/', type: 'folder', indent: 0, desc: 'Unit and integration tests' })
    base.push({ name: 'test_agents.py', type: 'file', indent: 1, desc: 'pytest tests for each agent node' })
  }
  base.push({ name: '.env.example', type: 'file', indent: 0, desc: 'Required environment variables with placeholder values' })

  return base
}

export function nodesToSupabaseRows(projectId: string, nodes: AgentNode[]) {
  return nodes.map((n) => ({
    project_id: projectId,
    name: n.label,
    type: n.type,
    model_id: 'claude-haiku-4-5-20251001',
    system_prompt: n.desc,
    tools: [],
    memory: false,
    max_retries: 3,
    // store full node data as JSON in system_prompt field for retrieval
    // we'll use a separate meta field via the name+type combo
  }))
}

// Reconstruct AgentNode from a Supabase agent_nodes row
export function rowToAgentNode(row: any, index: number): AgentNode {
  // Map type back to icon/color
  const TYPE_META: Record<string, { icon: string; color: string }> = {
    trigger:   { icon: '⚡', color: 'border-accent-cyan/40 bg-accent-cyan/5' },
    processor: { icon: '📥', color: 'border-brand-500/40 bg-brand-500/5' },
    analyzer:  { icon: '🧠', color: 'border-accent-purple/40 bg-accent-purple/5' },
    generator: { icon: '✍️', color: 'border-accent-purple/40 bg-accent-purple/5' },
    evaluator: { icon: '✅', color: 'border-accent-amber/40 bg-accent-amber/5' },
    notifier:  { icon: '📤', color: 'border-accent-emerald/40 bg-accent-emerald/5' },
  }
  const meta = TYPE_META[row.type] || TYPE_META.processor
  return {
    id: `n${index + 1}`,
    icon: meta.icon,
    label: row.name,
    desc: row.system_prompt || '',
    type: row.type,
    color: meta.color,
  }
}
