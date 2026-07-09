import { create } from 'zustand'
import type { TaskType } from '../constants/models'

export type ProjectType =
	| 'Object Detection'
	| 'Semantic Segmentation'
	| 'Instance Segmentation'
	| 'Classification'
	| 'Keypoint Detection'
	| 'OCR'
	| 'Video Tracking'
	| '3D Vision'
	| 'COG'
export type ProjectStatus = 'Active' | 'Archived' | 'Draft' | 'Completed'

export interface Project {
	id: string
	name: string
	description: string
	type: ProjectType
	datasetCount: number
	annotationProgress: number // 0-100
	members: string[] // Team member avatar URLs or names
	lastUpdated: number // Timestamp
	status: ProjectStatus
	isPinned: boolean
	isFavorite: boolean
	thumbnail: string
	task_type?: TaskType
}

interface ProjectState {
	projects: Project[]
	searchQuery: string
	filterType: ProjectType | 'All'
	sortBy: 'Updated' | 'Name' | 'Progress' | 'Oldest'

	// Actions
	setProjects: (projects: Project[]) => void
	setSearchQuery: (query: string) => void
	setFilterType: (type: ProjectType | 'All') => void
	setSortBy: (sort: 'Updated' | 'Name' | 'Progress' | 'Oldest') => void
	addProject: (project: Project) => void
	updateProject: (id: string, partial: Partial<Project>) => void
	deleteProject: (id: string) => void
	togglePin: (id: string) => void
	duplicateProject: (id: string) => void
}

export const use_project_store = create<ProjectState>((set) => ({
	projects: [],
	searchQuery: '',
	filterType: 'All',
	sortBy: 'Updated',

	setProjects: (projects) => set({ projects }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	setFilterType: (type) => set({ filterType: type }),
	setSortBy: (sort) => set({ sortBy: sort }),

	addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

	updateProject: (id, partial) =>
		set((state) => ({
			projects: state.projects.map((p) => (p.id === id ? { ...p, ...partial } : p))
		})),

	deleteProject: (id) =>
		set((state) => ({
			projects: state.projects.filter((p) => p.id !== id)
		})),

	togglePin: (id) =>
		set((state) => ({
			projects: state.projects.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p))
		})),

	duplicateProject: (id) =>
		set((state) => {
			const project_to_duplicate = state.projects.find((p) => p.id === id)
			if (!project_to_duplicate) return state
			const new_project = {
				...project_to_duplicate,
				id: Math.random().toString(36).substring(7),
				name: `${project_to_duplicate.name} (Copy)`,
				lastUpdated: Date.now()
			}
			return { projects: [new_project, ...state.projects] }
		})
}))
