import { client } from './client'
import type { Template } from '../types'

export const getTemplates = (category?: string) =>
  client.get<Template[]>('/api/templates', { params: { category } }).then((r) => r.data)

// Static fallback templates for demo (no backend needed)
export const STATIC_TEMPLATES: Template[] = [
  {
    id: '1', name: 'RAG Pipeline', framework: 'langgraph',
    category: 'RAG', tags: ['Python', 'FastAPI', 'Pinecone'],
    description: 'Retrieval-augmented generation over your own documents with vector search.',
  },
  {
    id: '2', name: 'AI Chatbot', framework: 'pydanticai',
    category: 'Chatbot', tags: ['Python', 'Redis'],
    description: 'Production-ready chatbot with memory, tool use, and multi-turn conversations.',
  },
  {
    id: '3', name: 'Autonomous Research', framework: 'crewai',
    category: 'Autonomous', tags: ['Python', 'Tavily'],
    description: 'Multi-agent swarm that searches the web and generates structured reports.',
  },
  {
    id: '4', name: 'Data Pipeline Agent', framework: 'langgraph',
    category: 'Data Pipeline', tags: ['Python', 'Postgres'],
    description: 'ETL agent that ingests, transforms, and loads data with error recovery.',
  },
  {
    id: '5', name: 'PDF Q&A Engine', framework: 'pydanticai',
    category: 'RAG', tags: ['Python', 'Weaviate'],
    description: 'Upload PDFs and ask questions. Powered by vector embeddings.',
  },
  {
    id: '6', name: 'Blank Canvas', framework: 'custom',
    category: 'Custom', tags: [],
    description: 'Start from scratch with a blank agent canvas.',
  },
]
