import { useState } from 'react'
import {
	Search,
	Plus,
	Folder,
	LayoutGrid,
	List as ListIcon,
	MoreVertical,
	Image as ImageIcon,
	Tag,
	Clock,
	ArrowLeft,
	Filter,
	Download,
	GitBranch,
	Database,
	ArrowUpRight
} from 'lucide-react'
import VirtualGallery from '../../components/VirtualGallery'

interface DatasetInfo {
	id: number
	name: string
	count: string
	classes: number
	size: string
	updated: string
	status: string
	tags: string[]
}

const MOCK_DATASETS = [
	{
		id: 1,
		name: 'Urban_Vehicles_v4',
		count: '42.8k',
		classes: 12,
		size: '14.2 GB',
		updated: '2 hrs ago',
		status: 'Ready',
		tags: ['bbox', 'driving']
	},
	{
		id: 2,
		name: 'Drone_Terrain_Maps',
		count: '15.2k',
		classes: 4,
		size: '8.1 GB',
		updated: '5 hrs ago',
		status: 'Processing',
		tags: ['segmentation', 'aerial']
	},
	{
		id: 3,
		name: 'Pedestrian_Tracking_2023',
		count: '100k',
		classes: 1,
		size: '45.0 GB',
		updated: '2 days ago',
		status: 'Ready',
		tags: ['bbox', 'tracking']
	},
	{
		id: 4,
		name: 'Retail_Shelves_DB',
		count: '8.5k',
		classes: 500,
		size: '3.4 GB',
		updated: '1 week ago',
		status: 'Ready',
		tags: ['classification', 'retail']
	},
	{
		id: 5,
		name: 'Defect_Inspection',
		count: '2.1k',
		classes: 3,
		size: '1.2 GB',
		updated: '2 weeks ago',
		status: 'Ready',
		tags: ['segmentation', 'industrial']
	}
]

function render_dataset_grid_card(
	ds: DatasetInfo,
	onSelect: (ds: DatasetInfo) => void,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_card: string
) {
	const status_color = ds.status === 'Ready'
		? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
		: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'

	return (
		<div
			key={ds.id}
			onClick={() => onSelect(ds)}
			className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group group-hover:scale-[1.01]`}
		>
			<div
				className={`h-32 ${isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-100'} p-4 relative flex items-center justify-center`}
			>
				<Database
					size={32}
					className={`${isDarkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:scale-110 transition-transform duration-500`}
				/>
				<div className="absolute top-3 right-3">
					<span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${status_color}`}>
						{ds.status}
					</span>
				</div>
			</div>
			<div className="p-5">
				<div className="flex justify-between items-start mb-2">
					<h3 className={`font-semibold tracking-tight truncate ${text_heading}`}>
						{ds.name}
					</h3>
					<button
						className={`text-zinc-400 hover:text-blue-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`}
						onClick={(e) => e.stopPropagation()}
					>
						<MoreVertical size={16} />
					</button>
				</div>
				<div className={`flex flex-wrap gap-4 text-xs ${text_muted} mb-4`}>
					<span className="flex items-center gap-1.5">
						<ImageIcon size={14} /> {ds.count}
					</span>
					<span className="flex items-center gap-1.5">
						<Tag size={14} /> {ds.classes}
					</span>
					<span className="flex items-center gap-1.5">
						<Clock size={14} /> {ds.updated}
					</span>
				</div>
				<div className="flex gap-2">
					{ds.tags.map((tag) => (
						<span
							key={tag}
							className={`px-2 py-1 rounded-md text-[10px] font-medium border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}
						>
							{tag}
						</span>
					))}
				</div>
			</div>
		</div>
	)
}

function render_dataset_grid(
	filtered: DatasetInfo[],
	onSelect: (ds: DatasetInfo) => void,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_card: string
) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{filtered.map((ds) => render_dataset_grid_card(ds, onSelect, isDarkMode, text_heading, text_muted, border_subtle, bg_card))}
		</div>
	)
}

function render_dataset_list(
	filtered: DatasetInfo[],
	onSelect: (ds: DatasetInfo) => void,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_subtle: string
) {
	return (
		<div className={`rounded-xl border ${border_subtle} ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} overflow-hidden`}>
			<table className="w-full text-sm text-left">
				<thead className={`text-xs uppercase ${bg_subtle} ${text_muted} border-b ${border_subtle}`}>
					<tr>
						<th className="px-6 py-4 font-medium">Dataset</th>
						<th className="px-6 py-4 font-medium">Size</th>
						<th className="px-6 py-4 font-medium">Status</th>
						<th className="px-6 py-4 font-medium">Tags</th>
						<th className="px-6 py-4 font-medium text-right">Last Updated</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-zinc-800/20">
					{filtered.map((ds) => (
						<tr
							key={ds.id}
							onClick={() => onSelect(ds)}
							className={`hover:${bg_subtle} transition-colors cursor-pointer group`}
						>
							<td className="px-6 py-4">
								<div className="flex items-center gap-3">
									<div className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
										<Database size={16} className={isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} />
									</div>
									<div>
										<div className={`font-medium ${text_heading}`}>{ds.name}</div>
										<div className={`text-xs mt-0.5 ${text_muted}`}>
											{ds.count} images • {ds.classes} classes
										</div>
									</div>
								</div>
							</td>
							<td className={`px-6 py-4 ${text_muted}`}>{ds.size}</td>
							<td className="px-6 py-4">
								<span
									className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider inline-flex ${ds.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}
								>
									{ds.status}
								</span>
							</td>
							<td className="px-6 py-4">
								<div className="flex gap-2">
									{ds.tags.map((tag) => (
										<span
											key={tag}
											className={`px-2 py-1 rounded-md text-[10px] font-medium border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}
										>
											{tag}
										</span>
									))}
								</div>
							</td>
							<td className={`px-6 py-4 text-right ${text_muted} flex justify-end items-center gap-2`}>
								{ds.updated}
								<ArrowUpRight
									size={14}
									className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default function datasets_view({
	isDarkMode,
	onUpload
}: {
	isDarkMode: boolean
	onUpload: () => void
}) {
	const [selected_dataset, set_selected_dataset] = useState<DatasetInfo | undefined>(undefined)
	const [view_mode, set_view_mode] = useState<'grid' | 'list'>('grid')

	if (selected_dataset) {
		return dataset_explorer({
			dataset: selected_dataset,
			onBack: () => {
				set_selected_dataset(undefined)
			},
			isDarkMode: isDarkMode,
			onUpload: onUpload
		})
	}

	return dataset_list({
		onSelect: set_selected_dataset,
		view_mode: view_mode,
		set_view_mode: set_view_mode,
		isDarkMode: isDarkMode,
		onUpload: onUpload
	})
}

function render_view_toggle_button(mode: 'grid' | 'list', current_mode: 'grid' | 'list', set_view_mode: (mode: 'grid' | 'list') => void, isDarkMode: boolean, icon: React.ReactNode) {
	const is_active = mode === current_mode
	const active_class = isDarkMode ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'
	const inactive_class = isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
	return (
		<button
			onClick={() => set_view_mode(mode)}
			className={`p-1.5 rounded-md transition-colors ${is_active ? active_class : inactive_class}`}
		>
			{icon}
		</button>
	)
}

function dataset_list({ onSelect, view_mode, set_view_mode, isDarkMode, onUpload }: { onSelect: (ds: DatasetInfo) => void; view_mode: 'grid' | 'list'; set_view_mode: (mode: 'grid' | 'list') => void; isDarkMode: boolean; onUpload: () => void }) {
	const [search_query, set_search_query] = useState('')

	const text_muted = isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = isDarkMode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const bg_card = isDarkMode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = isDarkMode ? 'text-zinc-100' : 'text-zinc-900'

	const filtered = MOCK_DATASETS.filter((d) =>
		d.name.toLowerCase().includes(search_query.toLowerCase())
	)

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
				<div>
					<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Datasets</h1>
					<p className={`text-sm mt-1 ${text_muted}`}>
						Manage your computer vision datasets and versions.
					</p>
				</div>

				<div className="flex gap-2">
					<button
						onClick={onUpload}
						className={`flex items-center gap-2 px-4 py-2 font-medium rounded-md border ${border_subtle} ${bg_card} hover:${bg_subtle} transition-colors text-sm`}
					>
						<Download size={16} /> Import
					</button>
					<button
						onClick={onUpload}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
					>
						<Plus size={16} /> Create Dataset
					</button>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div
					className={`flex items-center px-3 py-2 rounded-lg border ${border_subtle} ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} w-full sm:w-80`}
				>
					<Search size={16} className={text_muted} />
					<input
						type="text"
						placeholder="Search datasets..."
						className={`bg-transparent border-none outline-none text-sm ml-2 w-full ${isDarkMode ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
						value={search_query}
						onChange={(e) => set_search_query(e.target.value)}
					/>
				</div>

				<div className="flex gap-2 shrink-0">
					<button
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<Filter size={16} /> Filter
					</button>
					<div
						className={`inline-flex rounded-lg border p-1 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
					>
						{render_view_toggle_button('grid', view_mode, set_view_mode, isDarkMode, <LayoutGrid size={16} />)}
						{render_view_toggle_button('list', view_mode, set_view_mode, isDarkMode, <ListIcon size={16} />)}
					</div>
				</div>
			</div>

			{view_mode === 'grid'
				? render_dataset_grid(filtered, onSelect, isDarkMode, text_heading, text_muted, border_subtle, bg_card)
				: render_dataset_list(filtered, onSelect, isDarkMode, text_heading, text_muted, border_subtle, bg_subtle)}
		</div>
	)
}

function dataset_explorer({ dataset, onBack, isDarkMode, onUpload }: { dataset: DatasetInfo; onBack: () => void; isDarkMode: boolean; onUpload: () => void }) {
	const [active_folder, set_active_folder] = useState('All Images')

	const text_muted = isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = isDarkMode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const bg_card = isDarkMode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = isDarkMode ? 'text-zinc-100' : 'text-zinc-900'

	return (
		<div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-140px)]">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
				<div className="flex items-center gap-4">
					<button
						onClick={onBack}
						className={`p-2 rounded-md hover:${bg_subtle} border border-transparent hover:${border_subtle} transition-colors text-zinc-500`}
					>
						<ArrowLeft size={20} />
					</button>
					<div>
						<div className="flex items-center gap-3">
							<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>
								{dataset.name}
							</h1>
							<button
								className={`flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-md border ${border_subtle} hover:${bg_subtle} transition-colors ${text_muted}`}
							>
								<GitBranch size={14} /> v2 (latest)
							</button>
						</div>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{dataset.count} images • {dataset.classes} classes • {dataset.size}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={onUpload}
						className={`px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-md border ${border_subtle} ${bg_card} hover:${bg_subtle} transition-colors ${text_heading}`}
					>
						<Plus size={16} /> Add Data
					</button>
					<button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors">
						Start Training
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[500px]">
				<div
					className={`col-span-1 lg:col-span-3 rounded-xl border ${border_subtle} ${bg_card} flex flex-col overflow-hidden`}
				>
					<div className={`p-4 border-b ${border_subtle} font-medium text-sm ${text_heading}`}>
						Organization
					</div>
					<div className="p-2 space-y-1">
						{['All Images', 'Train Set', 'Validation Set', 'Test Set', 'Unassigned'].map((f) => (
							<button
								key={f}
								onClick={() => set_active_folder(f)}
								className={`w-full flex justify-between items-center px-3 py-2 text-sm rounded-md transition-colors ${active_folder === f ? (isDarkMode ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600 font-medium') : `hover:${bg_subtle} ${text_muted}`}`}
							>
								<div className="flex items-center gap-2.5">
									<Folder size={16} className={active_folder === f ? 'text-blue-500' : text_muted} />{' '}
									{f}
								</div>
								<span className="text-xs opacity-70">12k</span>
							</button>
						))}
					</div>

					<div
						className={`p-4 border-y ${border_subtle} font-medium text-sm flex justify-between items-center ${text_heading} mt-2`}
					>
						Classes
						<button className="p-1 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-colors">
							<Plus size={16} />
						</button>
					</div>
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{[
							{ name: 'vehicle', count: '14,200', color: 'bg-blue-500' },
							{ name: 'pedestrian', count: '8,400', color: 'bg-emerald-500' },
							{ name: 'traffic_light', count: '3,100', color: 'bg-amber-500' },
							{ name: 'cyclist', count: '1,200', color: 'bg-purple-500' }
						].map((c) => (
							<div
								key={c.name}
								className="flex justify-between items-center text-sm group cursor-pointer"
							>
								<div className="flex items-center gap-2.5">
									<span
										className={`w-2.5 h-2.5 rounded-full ${c.color} shadow-sm group-hover:scale-125 transition-transform`}
									></span>
									<span className={text_heading}>{c.name}</span>
								</div>
								<span className={`text-xs ${text_muted}`}>{c.count}</span>
							</div>
						))}
					</div>

					<div className={`p-4 border-t ${border_subtle} shrink-0`}>
						<div className={`text-sm font-medium mb-3 ${text_heading}`}>Dataset Split</div>
						<div className="flex h-2.5 rounded-full overflow-hidden mb-2 shadow-inner">
							<div className="bg-blue-500 w-[70%]" title="Train: 70%"></div>
							<div className="bg-emerald-500 w-[20%]" title="Val: 20%"></div>
							<div className="bg-amber-500 w-[10%]" title="Test: 10%"></div>
						</div>
						<div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-zinc-500">
							<span>
								Train<span className="hidden xl:inline"> (70%)</span>
							</span>
							<span>
								Val<span className="hidden xl:inline"> (20%)</span>
							</span>
							<span>
								Test<span className="hidden xl:inline"> (10%)</span>
							</span>
						</div>
					</div>
				</div>

				<div
					className={`col-span-1 lg:col-span-9 rounded-xl border ${border_subtle} ${bg_card} flex flex-col overflow-hidden`}
				>
					<VirtualGallery is_dark_mode={isDarkMode} />
				</div>
			</div>
		</div>
	)
}
