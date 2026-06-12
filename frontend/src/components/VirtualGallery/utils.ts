import type { Virtualizer } from '@tanstack/react-virtual'
import type { MockImage } from './types'

export function is_input_focused(e: KeyboardEvent) {
	return e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
}

export function handle_navigate_arrow_key(
	e: KeyboardEvent,
	focused_index: number,
	filtered_images: MockImage[],
	column_count: number,
	row_virtualizer: Virtualizer<HTMLDivElement, Element>,
	set_focused_index: (i: number | undefined) => void
) {
	const total = filtered_images.length
	let new_index = focused_index

	switch (e.key) {
		case 'ArrowRight':
			new_index = Math.min(new_index + 1, total - 1)
			break
		case 'ArrowLeft':
			new_index = Math.max(new_index - 1, 0)
			break
		case 'ArrowDown':
			new_index = Math.min(new_index + column_count, total - 1)
			break
		case 'ArrowUp':
			new_index = Math.max(new_index - column_count, 0)
			break
		default:
			return false
	}

	if (new_index !== focused_index) {
		e.preventDefault()
		set_focused_index(new_index)
		const row_index = Math.floor(new_index / column_count)
		row_virtualizer.scrollToIndex(row_index, { align: 'auto' })
	}
	return true
}

export function navigate_gallery(
	e: KeyboardEvent,
	deps: {
		focused_index: number | undefined
		filtered_images: MockImage[]
		column_count: number
		row_virtualizer: Virtualizer<HTMLDivElement, Element>
		handle_select: (id: MockImage['id'], shift_key: boolean) => void
		set_focused_index: (i: number | undefined) => void
		set_preview_image: (img: MockImage | undefined) => void
		set_selected_images: (
			value: Set<MockImage['id']> | ((prev: Set<MockImage['id']>) => Set<MockImage['id']>)
		) => void
	}
) {
	const {
		focused_index,
		filtered_images,
		column_count,
		row_virtualizer,
		handle_select,
		set_focused_index,
		set_preview_image,
		set_selected_images
	} = deps

	if (focused_index === undefined) {
		if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
			e.preventDefault()
			set_focused_index(0)
		}
		return
	}

	const is_handled = handle_navigate_arrow_key(
		e,
		focused_index,
		filtered_images,
		column_count,
		row_virtualizer,
		set_focused_index
	)
	if (is_handled) return

	if (e.key === ' ' || e.key === 'Enter') {
		e.preventDefault()
		if (filtered_images[focused_index]) {
			handle_select(filtered_images[focused_index]!.id, e.shiftKey)
		}
		return
	}

	if (e.key === 'Escape') {
		set_selected_images(new Set<MockImage['id']>())
		set_focused_index(undefined)
		set_preview_image(undefined)
		return
	}

	if (e.key === 'f') {
		if (filtered_images[focused_index]) {
			set_preview_image(filtered_images[focused_index]!)
		}
	}
}

export const generate_mock_images = (count: number): MockImage[] => {
	return Array.from({ length: count }).map((_, i) => ({
		id: i,
		status: i % 5 === 0 ? 'unannotated' : 'annotated',
		classes: ['vehicle', 'pedestrian', 'cyclist', 'traffic_light'].slice(0, (i % 3) + 1),
		width: 640,
		height: 480,
		url: `https://picsum.photos/seed/${i + 1000}/640/480`
	}))
}
