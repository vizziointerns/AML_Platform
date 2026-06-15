import type { Project, ProjectType, ProjectStatus } from '../store/projectStore'

const PROJECT_TYPE_VALUES: readonly ProjectType[] = [
	'Object Detection',
	'Semantic Segmentation',
	'Instance Segmentation',
	'Classification',
	'Keypoint Detection',
	'OCR',
	'Video Tracking',
	'3D Vision'
]

const PROJECT_STATUS_VALUES: readonly ProjectStatus[] = ['Active', 'Archived', 'Draft', 'Completed']

export interface DbProject {
	id: string
	user_id: string
	name: string
	description: string
	type: string
	status: string
	dataset_count: number
	annotation_progress: number
	members: string[]
	last_updated: number
	is_pinned: boolean
	is_favorite: boolean
	thumbnail: string
	cover_image_url?: string
}

export function map_project(db: DbProject): Project {
	const project_type: ProjectType = PROJECT_TYPE_VALUES.includes(db.type as ProjectType)
		? (db.type as ProjectType)
		: 'Object Detection'
	const project_status: ProjectStatus = PROJECT_STATUS_VALUES.includes(db.status as ProjectStatus)
		? (db.status as ProjectStatus)
		: 'Active'

	return {
		id: db.id,
		name: db.name,
		description: db.description,
		type: project_type,
		status: project_status,
		datasetCount: db.dataset_count,
		annotationProgress: db.annotation_progress,
		members: db.members ?? [],
		lastUpdated: db.last_updated,
		isPinned: db.is_pinned,
		isFavorite: db.is_favorite,
		thumbnail: db.thumbnail ?? '',
		coverImageUrl: db.cover_image_url ?? undefined
	}
}
