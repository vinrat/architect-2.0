export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  persona: 'vibe' | 'code'
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string
  framework: 'langgraph' | 'crewai' | 'pydanticai' | 'autogen' | 'custom'
  prompt: string
  status: 'active' | 'deploying' | 'deployed' | 'error'
  git_repo?: string
  git_branch: string
  deploy_url?: string
  token_usage: number
  created_at: string
  updated_at: string
}

export interface AgentNode {
  id: string
  project_id: string
  name: string
  type: 'trigger' | 'extractor' | 'analyzer' | 'generator' | 'evaluator' | 'notifier'
  model_id?: string
  system_prompt?: string
  tools: string[]
  memory: boolean
  max_retries: number
  position_x: number
  position_y: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Template {
  id: string
  name: string
  description: string
  framework: string
  category: string
  tags: string[]
}
