import { create } from 'zustand'
import { supabase } from '../utils/supabase'

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
	annotationProgress: number
	members: string[]
	lastUpdated: number
	status: ProjectStatus
	isPinned: boolean
	isFavorite: boolean
	thumbnail: string
	coverImageUrl?: string
}

interface ProjectState {
	projects: Project[]
	searchQuery: string
	project_type_filters: ProjectType[]
	sort_order: 'newest' | 'oldest'
	setSearchQuery: (q: string) => void
	set_project_type_filters: (f: ProjectType[]) => void
	set_sort_order: (o: 'newest' | 'oldest') => void
	clear_filters: () => void
	setProjects: (projects: Project[]) => void
	addProject: (project: Project) => void
	togglePin: (id: string) => Promise<void>
	deleteProject: (id: string) => Promise<void>
	duplicateProject: (id: string) => Promise<Project>
	renameProject: (id: string, name: string) => Promise<void>
	updateProjectCover: (id: string, coverImageUrl: string | undefined) => Promise<void>
}

function map_db_project_to_project(db: Record<string, unknown>): Project {
	const PROJECT_TYPE_VALUES: readonly string[] = [
		'Object Detection',
		'Semantic Segmentation',
		'Instance Segmentation',
		'Classification',
		'Keypoint Detection',
		'OCR',
		'Video Tracking',
		'3D Vision'
	]
	const PROJECT_STATUS_VALUES: readonly string[] = ['Active', 'Archived', 'Draft', 'Completed']

	const type_val = (db.type as string) ?? ''
	const project_type: ProjectType = PROJECT_TYPE_VALUES.includes(type_val)
		? (type_val as ProjectType)
		: 'Object Detection'
	const status_val = (db.status as string) ?? ''
	const project_status: ProjectStatus = PROJECT_STATUS_VALUES.includes(status_val)
		? (status_val as ProjectStatus)
		: 'Active'

	const val = (snake: string, camel: string): unknown => db[snake] ?? db[camel]

	return {
		id: val('id', 'id') as string,
		name: val('name', 'name') as string,
		description: val('description', 'description') as string,
		type: project_type,
		status: project_status,
		datasetCount: (val('dataset_count', 'datasetCount') as number) ?? 0,
		annotationProgress: (val('annotation_progress', 'annotationProgress') as number) ?? 0,
		members: ((val('members', 'members') as string[]) ?? []) as string[],
		lastUpdated: (val('last_updated', 'lastUpdated') as number) ?? 0,
		isPinned: (val('is_pinned', 'isPinned') as boolean) ?? false,
		isFavorite: (val('is_favorite', 'isFavorite') as boolean) ?? false,
		thumbnail: (val('thumbnail', 'thumbnail') as string) ?? '',
		coverImageUrl: (val('cover_image_url', 'coverImageUrl') as string | undefined) ?? undefined
	}
}

export const use_project_store = create<ProjectState>((set, get) => ({
	projects: [],
	searchQuery: '',
	filterType: 'All',
	sortBy: 'Updated',
	project_type_filters: [],
	sort_order: 'newest',

	setProjects: (projects) => set({ projects }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	set_project_type_filters: (filters) => set({ project_type_filters: filters }),
	set_sort_order: (order) => set({ sort_order: order }),
	clear_filters: () => set({ project_type_filters: [], sort_order: 'newest' }),

	addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

	deleteProject: async (id) => {
		// Optimistic local removal — revert on supabase failure
		const prev = get().projects
		set((state) => ({
			projects: state.projects.filter((p) => p.id !== id)
		}))
		const { error } = await supabase.from('projects').delete().eq('id', id)
		if (error) {
			set({ projects: prev })
			throw new Error(error.message)
		}
	},

	togglePin: async (id) => {
		const project = get().projects.find((p) => p.id === id)
		if (!project) return
		const is_new_pinned = !project.isPinned

		set((state) => ({
			projects: state.projects.map((p) => (p.id === id ? { ...p, isPinned: is_new_pinned } : p))
		}))

		const { error } = await supabase
			.from('projects')
			.update({ is_pinned: is_new_pinned })
			.eq('id', id)
		if (error) {
			set((state) => ({
				projects: state.projects.map((p) => (p.id === id ? { ...p, isPinned: !is_new_pinned } : p))
			}))
			throw new Error(error.message)
		}
	},

	duplicateProject: async (id) => {
		const project = get().projects.find((p) => p.id === id)
		if (!project) throw new Error('Project not found')

		const new_name = `${project.name} (Copy)`
		// Fetch the authenticated user for the foreign key; avoids spreading raw supabase
		// response which can fail if column names differ between Supabase and the DB schema.
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user?.id) throw new Error('Authentication required')

		// Build the insert record from the in-memory Project object using snake_case
		// column names that match the Supabase schema, not the camelCase Project interface.
		const duplicate_record: Record<string, unknown> = {
			id: crypto.randomUUID(),
			user_id: user.id,
			name: new_name,
			description: project.description,
			type: project.type,
			status: project.status,
			dataset_count: project.datasetCount,
			annotation_progress: project.annotationProgress,
			members: project.members ?? [],
			last_updated: Date.now(),
			is_pinned: false,
			is_favorite: false,
			thumbnail: project.thumbnail ?? '',
			cover_image_url: project.coverImageUrl ?? ''
		}

		const { data: inserted, error: insert_error } = await supabase
			.from('projects')
			.insert(duplicate_record)
			.select()
			.single()
		if (insert_error) throw new Error(insert_error.message)

		// Map the DB response (which may use snake_case or camelCase keys) to the
		// Project interface via map_db_project_to_project which checks both conventions.
		const new_project = map_db_project_to_project(inserted as Record<string, unknown>)

		// Insert the duplicated project directly below the original in the local array
		// so the UI reflects the new order without a refetch.
		const projects = get().projects
		const original_index = projects.findIndex((p) => p.id === id)
		const updated_projects = [...projects]
		updated_projects.splice(original_index + 1, 0, new_project)
		set({ projects: updated_projects })

		return new_project
	},

	renameProject: async (id, name) => {
		const trimmed = name.trim()
		if (!trimmed) throw new Error('Project name cannot be empty')

		const prev = get().projects
		set((state) => ({
			projects: state.projects.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
		}))

		const { error } = await supabase
			.from('projects')
			.update({ name: trimmed, last_updated: Date.now() })
			.eq('id', id)
		if (error) {
			set({ projects: prev })
			throw new Error(error.message)
		}
	},

	updateProjectCover: async (id, coverImageUrl) => {
		const prev = get().projects
		set((state) => ({
			projects: state.projects.map((p) => (p.id === id ? { ...p, coverImageUrl } : p))
		}))

		const { error } = await supabase
			.from('projects')
			.update({ cover_image_url: coverImageUrl, last_updated: Date.now() })
			.eq('id', id)
		if (error) {
			set({ projects: prev })
			throw new Error(error.message)
		}
	}
}))
