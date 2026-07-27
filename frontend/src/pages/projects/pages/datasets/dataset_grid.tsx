import { dataset_card } from '../../../../components/datasets/dataset_card'
import { dataset_list_row } from '../../../../components/datasets/dataset_list_row'
import type { DatasetInfo } from '../../../../hooks/use_datasets'

export function dataset_grid_view({
	datasets,
	is_dark_mode,
	view_mode,
	on_select,
	on_rename,
	on_delete,
	open_menu_id,
	on_menu_toggle
}: {
	datasets: DatasetInfo[]
	is_dark_mode: boolean
	view_mode: 'grid' | 'list'
	on_select: (ds: DatasetInfo) => void
	on_rename: (ds: DatasetInfo) => void
	on_delete: (ds: DatasetInfo) => void
	open_menu_id: string | undefined
	on_menu_toggle: (id: string) => void
}) {
	if (view_mode === 'grid') {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{datasets.map((ds) =>
					dataset_card({
						key: ds.id,
						dataset: ds,
						is_dark_mode,
						on_select,
						on_rename,
						on_delete,
						is_menu_open: open_menu_id === ds.id,
						on_menu_toggle: () => on_menu_toggle(ds.id)
					})
				)}
			</div>
		)
	}

	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	return (
		<div
			className={`rounded-xl border ${border_subtle} ${is_dark_mode ? 'bg-zinc-900' : 'bg-white'} overflow-hidden`}
		>
			<table className="w-full text-sm text-left">
				<thead
					className={`text-xs uppercase ${bg_subtle} ${is_dark_mode ? 'text-zinc-400 border-b border-zinc-800' : 'text-zinc-500 border-b border-zinc-200'}`}
				>
					<tr>
						<th className="px-6 py-4 font-medium">Dataset</th>
						<th className="px-6 py-4 font-medium">Size</th>
						<th className="px-6 py-4 font-medium">Status</th>
						<th className="px-6 py-4 font-medium">Tags</th>
						<th className="px-6 py-4 font-medium text-right">Last Updated</th>
						<th className="px-6 py-4 font-medium w-12"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-zinc-800/20">
					{datasets.map((ds) =>
						dataset_list_row({
							key: ds.id,
							dataset: ds,
							is_dark_mode,
							on_select,
							on_rename,
							on_delete,
							is_menu_open: open_menu_id === ds.id,
							on_menu_toggle: () => on_menu_toggle(ds.id)
						})
					)}
				</tbody>
			</table>
		</div>
	)
}
