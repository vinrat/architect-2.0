import { client } from './client'
import type { Project } from '../types'

export const getProjects = () =>
  client.get<Project[]>('/api/projects').then((r) => r.data)

export const getProject = (id: string) =>
  client.get<Project>(`/api/projects/${id}`).then((r) => r.data)

export const createProject = (data: Partial<Project>) =>
  client.post<Project>('/api/projects', data).then((r) => r.data)

export const updateProject = (id: string, data: Partial<Project>) =>
  client.put<Project>(`/api/projects/${id}`, data).then((r) => r.data)

export const deleteProject = (id: string) =>
  client.delete(`/api/projects/${id}`)

export const synthesizeApp = (prompt: string, framework: string) =>
  client.post<{ job_id: string; project_id: string }>(
    '/api/synthesize',
    { prompt, framework }
  ).then((r) => r.data)

export const deployProject = (id: string) =>
  client.post(`/api/projects/${id}/deploy`).then((r) => r.data)
