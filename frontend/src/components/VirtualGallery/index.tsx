import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Filter, Tag, Folder, Trash } from 'lucide-react'
import type { MockImage } from './types'
import { generate_mock_images, is_input_focused, navigate_gallery } from './utils'
import { gallery_image as GalleryImage, render_preview_modal } from './render'

interface VirtualGalleryProps {
	is_dark_mode: boolean
	images?: MockImage[]
	on_open_annotation?: (img: MockImage) => void
	on_delete_selected?: (image_ids: string[]) => Promise<void>
	is_deleting_selected?: boolean
}

export default function virtual_gallery({
	is_dark_mode,
	images: external_images,
	on_open_annotation,
	on_delete_selected,
	is_deleting_selected = false
}: VirtualGalleryProps) {
	const [search_query, set_search_query] = useState('')
	const [images, set_images] = useState<MockImage[]>([])
	const [selected_images, set_selected_images] = useState<Set<MockImage['id']>>(new Set())
	const [focused_index, set_focused_index] = useState<number | undefined>(undefined)
	const [preview_image, set_preview_image] = useState<MockImage | undefined>(undefined)
	const [is_loading, set_is_loading] = useState(false)
	const [last_selected, set_last_selected] = useState<MockImage['id'] | undefined>(undefined)

	const parent_ref = useRef<HTMLDivElement>(undefined!)
	const container_width_ref = useRef<number>(0)
	const [column_count, set_column_count] = useState(4)

	useEffect(() => {
		if (external_images) {
			set_images(external_images)
		} else {
			set_images(generate_mock_images(100))
		}
	}, [external_images])

	const filtered_images = useMemo(() => {
		if (!search_query) return images
		const lower_q = search_query.toLowerCase()
		return images.filter(
			(img) =>
				img.classes.some((c: string) => c.toLowerCase().includes(lower_q)) ||
				img.status.includes(lower_q)
		)
	}, [images, search_query])

	useEffect(() => {
		const valid_ids = new Set(images.map((image) => image.id))

		set_selected_images((prev) => {
			const next = new Set([...prev].filter((id) => valid_ids.has(id)))
			return next.size === prev.size ? prev : next
		})
		set_last_selected((prev) => (prev !== undefined && valid_ids.has(prev) ? prev : undefined))
		set_preview_image((prev) => (prev && valid_ids.has(prev.id) ? prev : undefined))
		set_focused_index((prev) => {
			if (prev === undefined) return prev
			if (filtered_images.length === 0) return undefined
			return Math.min(prev, filtered_images.length - 1)
		})
	}, [filtered_images.length, images])

	useEffect(() => {
		const observer = new ResizeObserver((entries) => {
			if (entries[0]) {
				container_width_ref.current = entries[0].contentRect.width
				const base_cols = Math.max(1, Math.floor(entries[0].contentRect.width / 250))
				set_column_count(Math.max(1, base_cols))
			}
		})

		if (parent_ref.current) {
			observer.observe(parent_ref.current)
		}
		return () => observer.disconnect()
	}, [])

	const row_count = Math.ceil(filtered_images.length / column_count)

	const row_virtualizer = useVirtualizer({
		count: row_count,
		getScrollElement: () => parent_ref.current,
		estimateSize: useCallback(() => container_width_ref.current / column_count, [column_count]),
		overscan: 5
	})

	useEffect(() => {
		if (external_images) return

		const [last_item] = [...row_virtualizer.getVirtualItems()].reverse()

		if (!last_item) return

		if (
			last_item.index >= row_count - 1 &&
			!is_loading &&
			filtered_images.length < 5000 &&
			!search_query
		) {
			set_is_loading(true)
			setTimeout(() => {
				set_images((prev) => [...prev, ...generate_mock_images(100)])
				set_is_loading(false)
			}, 800)
		}
	}, [
		row_virtualizer.getVirtualItems(),
		row_count,
		is_loading,
		filtered_images.length,
		search_query,
		external_images
	])

	useEffect(() => {
		const handle_key_down = (e: KeyboardEvent) => {
			if (is_input_focused(e)) return
			navigate_gallery(e, {
				focused_index,
				filtered_images,
				column_count,
				row_virtualizer,
				handle_select,
				set_focused_index,
				set_preview_image,
				set_selected_images
			})
		}

		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [focused_index, column_count, filtered_images, row_virtualizer])

	const toggle_single_selection = (set: Set<MockImage['id']>, id: MockImage['id']) => {
		if (set.has(id)) {
			set.delete(id)
		} else {
			set.add(id)
		}
	}

	const add_range_selection = (
		set: Set<MockImage['id']>,
		id: MockImage['id'],
		anchor: MockImage['id'] | undefined
	) => {
		if (anchor === undefined) return

		const start = filtered_images.findIndex((img) => img.id === anchor)
		const end = filtered_images.findIndex((img) => img.id === id)
		if (start === -1 || end === -1) return

		const min = Math.min(start, end)
		const max = Math.max(start, end)
		for (let i = min; i <= max; i++) {
			const img = filtered_images[i]
			if (img) set.add(img.id)
		}
	}

	const handle_select = (id: MockImage['id'], shift_key: boolean) => {
		set_selected_images((prev) => {
			const new_set = new Set(prev)

			if (shift_key && last_selected !== undefined) {
				add_range_selection(new_set, id, last_selected)
			} else {
				toggle_single_selection(new_set, id)
			}

			set_last_selected(id)
			return new_set
		})
	}

	const handle_delete_selected = async () => {
		if (!on_delete_selected || selected_images.size === 0 || is_deleting_selected) return
		await on_delete_selected(Array.from(selected_images).map((id) => String(id)))
		set_selected_images(new Set())
		set_last_selected(undefined)
	}

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	return (
		<>
			<div className="flex flex-col h-full bg-zinc-50/50 dark:bg-[#09090b]">
				<div
					className={`p-3 border-b ${border_subtle} flex flex-wrap gap-4 justify-between items-center bg-white dark:bg-zinc-900 shrink-0`}
				>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 px-2 text-sm text-zinc-500 dark:text-zinc-400">
							<span className="font-medium text-zinc-900 dark:text-zinc-100">
								{selected_images.size}
							</span>{' '}
							selected
							<span className="mx-2 opacity-50">|</span>
							<span>{filtered_images.length} items</span>
						</div>

						{selected_images.size > 0 && (
							<div className="flex items-center animate-in fade-in slide-in-from-left-4 duration-300">
								<div className={`w-px h-4 mx-2 ${border_subtle}`}></div>
								<div className="flex gap-1">
									<button
										onClick={() => {
											void handle_delete_selected()
										}}
										disabled={is_deleting_selected}
										className={`p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-50`}
										title="Delete"
									>
										<Trash size={16} />
									</button>
								</div>
							</div>
						)}
					</div>

					<div className="flex items-center gap-3">
						<div
							className={`flex items-center px-3 py-1.5 rounded-lg border ${border_subtle} ${is_dark_mode ? 'bg-zinc-950' : 'bg-white'}`}
						>
							<Search size={14} className={text_muted} />
							<input
								type="text"
								placeholder="Search labels..."
								value={search_query}
								onChange={(e) => set_search_query(e.target.value)}
								className={`bg-transparent border-none outline-none text-sm ml-2 w-24 xl:w-40 ${is_dark_mode ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
							/>
						</div>
						<button
							className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border ${border_subtle} bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
						>
							<Filter size={16} /> Filters
						</button>
					</div>
				</div>

				<div ref={parent_ref} className="flex-1 overflow-auto outline-none" tabIndex={0}>
					<div
						style={{
							height: `${row_virtualizer.getTotalSize()}px`,
							width: '100%',
							position: 'relative'
						}}
					>
						{row_virtualizer.getVirtualItems().map((virtualRow) => {
							const start_index = virtualRow.index * column_count
							const row_images = filtered_images.slice(start_index, start_index + column_count)
							const item_width = container_width_ref.current / column_count

							return (
								<div
									key={virtualRow.index}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: `${virtualRow.size}px`,
										transform: `translateY(${virtualRow.start}px)`,
										display: 'flex'
									}}
									className="px-4"
								>
									{row_images.map((img, col_index) => {
										const global_index = start_index + col_index
										const is_selected = selected_images.has(img.id)
										const is_focused = global_index === focused_index

										return (
											<GalleryImage
												img={img}
												global_index={global_index}
												is_selected={is_selected}
												is_focused={is_focused}
												item_width={item_width}
												virtual_row_size={virtualRow.size}
												is_dark_mode={is_dark_mode}
												set_focused_index={set_focused_index}
												handle_select={handle_select}
												set_preview_image={set_preview_image}
												on_open_annotation={on_open_annotation}
											/>
										)
									})}
								</div>
							)
						})}
					</div>

					{is_loading && (
						<div className="flex justify-center p-4">
							<div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						</div>
					)}
				</div>
			</div>

			{render_preview_modal(preview_image, set_preview_image)}
		</>
	)
}
