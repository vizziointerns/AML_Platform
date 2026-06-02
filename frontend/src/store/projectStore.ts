import { create } from 'zustand'

export type ProjectType =
	| 'Object Detection'
	| 'Semantic Segmentation'
	| 'Instance Segmentation'
	| 'Classification'
	| 'Keypoint Detection'
	| 'OCR'
	| 'Video Tracking'
	| '3D Vision'
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
}

interface ProjectState {
	projects: Project[]
	activeProjectId: string | undefined
	searchQuery: string
	filterType: ProjectType | 'All'
	sortBy: 'Updated' | 'Name' | 'Progress' | 'Oldest'

	// Actions
	setSearchQuery: (query: string) => void
	setFilterType: (type: ProjectType | 'All') => void
	setSortBy: (sort: 'Updated' | 'Name' | 'Progress' | 'Oldest') => void
	addProject: (project: Project) => void
	updateProject: (id: string, partial: Partial<Project>) => void
	deleteProject: (id: string) => void
	togglePin: (id: string) => void
	setActiveProject: (id: string | undefined) => void
	duplicateProject: (id: string) => void
}

// Generate some dummy data
const DUMMY_PROJECTS: Project[] = [
	{
		id: 'p1',
		name: 'Autonomous Driving Pedestrians',
		description: 'Detecting pedestrians in urban environments from dashboard cameras.',
		type: 'Object Detection',
		datasetCount: 15420,
		annotationProgress: 76,
		members: ['Alex', 'Sam', 'Jo', 'Dana'],
		lastUpdated: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
		status: 'Active',
		isPinned: true,
		isFavorite: false,
		thumbnail:
			'https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&q=80&w=400'
	},
	{
		id: 'p2',
		name: 'Medical MRI Segmentation',
		description: 'semantic segmentation of brain tumors in MRI scans.',
		type: 'Semantic Segmentation',
		datasetCount: 4200,
		annotationProgress: 42,
		members: ['Dr. Smith', 'Sam'],
		lastUpdated: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
		status: 'Active',
		isPinned: true,
		isFavorite: true,
		thumbnail:
			'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=400'
	},
	{
		id: 'p3',
		name: 'Retail Shelf Inventory',
		description: 'Instance segmentation for products on retail shelves.',
		type: 'Instance Segmentation',
		datasetCount: 890,
		annotationProgress: 100,
		members: ['Jo'],
		lastUpdated: Date.now() - 1000 * 60 * 60 * 24 * 10,
		status: 'Completed',
		isPinned: false,
		isFavorite: false,
		thumbnail:
			'https://images.unsplash.com/photo-1588636400584-6997092c4cd7?auto=format&fit=crop&q=80&w=400'
	},
	{
		id: 'p4',
		name: 'Receipt OCR Extracts',
		description: 'Text extraction from scanned receipts and invoices.',
		type: 'OCR',
		datasetCount: 85000,
		annotationProgress: 12,
		members: ['Alex', 'Dana'],
		lastUpdated: Date.now() - 1000 * 60 * 45, // 45 mins ago
		status: 'Active',
		isPinned: false,
		isFavorite: false,
		thumbnail:
			'https://images.unsplash.com/photo-1554224155-8d04cb21cdf4?auto=format&fit=crop&q=80&w=400'
	},
	{
		id: 'p5',
		name: 'Satellite Deforestation Tracking',
		description: 'Tracking changes in forest cover using semantic segmentation.',
		type: 'Semantic Segmentation',
		datasetCount: 3200,
		annotationProgress: 5,
		members: ['Jo', 'Sam', 'Dana', 'Alex', 'Dr. Green'],
		lastUpdated: Date.now() - 1000 * 60 * 60 * 24 * 1,
		status: 'Draft',
		isPinned: false,
		isFavorite: false,
		thumbnail:
			'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400'
	}
]

export const use_project_store = create<ProjectState>((set) => ({
	projects: DUMMY_PROJECTS,
	activeProjectId: undefined,
	searchQuery: '',
	filterType: 'All',
	sortBy: 'Updated',

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
			projects: state.projects.filter((p) => p.id !== id),
			activeProjectId: state.activeProjectId === id ? undefined : state.activeProjectId
		})),

	togglePin: (id) =>
		set((state) => ({
			projects: state.projects.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p))
		})),

	setActiveProject: (id) => set({ activeProjectId: id }),

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
