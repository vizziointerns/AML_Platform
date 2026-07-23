import type { ClassInfo } from './types'
import type { ModelOption } from './render'
import { fetch_classes, save_classes_to_backend } from '../../../../api/classes'
import { fetch_training_runs } from '../../../../api/training'

export function fetch_dataset_classes_effect(
	dataset_id: string | undefined,
	set_classes: React.Dispatch<React.SetStateAction<ClassInfo[]>>,
	set_active_class: React.Dispatch<React.SetStateAction<string>>,
	classes_fetched: React.MutableRefObject<boolean>
): (() => void) | undefined {
	if (!dataset_id) return undefined
	let is_cancelled = false
	fetch_classes(dataset_id)
		.then((backend_classes) => {
			if (is_cancelled) return
			if (backend_classes.length > 0) {
				classes_fetched.current = true
				set_classes(backend_classes)
				set_active_class((prev) =>
					backend_classes.some((c) => c.id === prev) ? prev : (backend_classes[0]?.id ?? '')
				)
			}
		})
		.catch(() => {
			/* fall back to localStorage */
		})
	return () => {
		is_cancelled = true
	}
}

export function save_classes_backend_effect(
	dataset_id: string | undefined,
	classes_fetched: React.MutableRefObject<boolean>,
	classes: ClassInfo[],
	save_backend_timeout: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>
): (() => void) | undefined {
	if (!dataset_id) return undefined
	if (classes_fetched.current) {
		classes_fetched.current = false
		return undefined
	}
	if (classes.length === 0) return undefined
	if (save_backend_timeout.current) clearTimeout(save_backend_timeout.current)
	save_backend_timeout.current = setTimeout(() => {
		save_classes_to_backend(dataset_id, classes).catch(() => {
			/* silently ignore */
		})
	}, 500)
	return () => {
		if (save_backend_timeout.current) clearTimeout(save_backend_timeout.current)
	}
}

export function fetch_training_runs_effect(
	project_id: string | undefined,
	set_custom_models: React.Dispatch<React.SetStateAction<ModelOption[]>>
): (() => void) | undefined {
	if (!project_id) return undefined
	set_custom_models([])
	let is_cancelled = false
	fetch_training_runs(project_id)
		.then((runs) => {
			if (is_cancelled) return
			set_custom_models(
				runs
					.filter((r) => r.status === 'Completed')
					.map((r) => ({
						id: r.id,
						name: r.name,
						task_type: r.task_type,
						accuracy: r.accuracy
					}))
			)
		})
		.catch(() => {
			if (!is_cancelled) set_custom_models([])
		})
	return () => {
		is_cancelled = true
	}
}
