import { useCallback, useState } from 'react'
import {
	ReactFlow,
	MiniMap,
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
	type Connection,
	type Edge,
	type Node,
	Handle,
	Position,
	Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Play, Settings2, Database, BrainCircuit, FileText } from 'lucide-react'

interface workflow_builder_props {
	is_dark_mode: boolean
}

const data_node = ({ data, is_connectable = true }: { data: { label: string }; is_connectable?: boolean }) => {
	return (
		<div
			className={`px-4 py-3 rounded-lg shadow-sm border bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900`}
		>
			<Handle
				type="target"
				position={Position.Top}
				isConnectable={is_connectable}
				className="w-2 h-2 !bg-indigo-500"
			/>
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
					<Database size={16} />
				</div>
				<div>
					<div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.label}</div>
					<div className="text-xs text-zinc-500 dark:text-zinc-400">Data Source</div>
				</div>
			</div>
			<Handle
				type="source"
				position={Position.Bottom}
				isConnectable={is_connectable}
				className="w-2 h-2 !bg-indigo-500"
			/>
		</div>
	)
}

const model_node = ({ data, is_connectable = true, selected }: { data: { label: string; status?: string }; is_connectable?: boolean; selected: boolean }) => {
	return (
		<div
			className={`px-4 py-3 rounded-lg shadow-sm border ${selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-emerald-200 dark:border-emerald-900'} bg-white dark:bg-zinc-900`}
		>
			<Handle
				type="target"
				position={Position.Top}
				isConnectable={is_connectable}
				className="w-2 h-2 !bg-emerald-500"
			/>
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
					<BrainCircuit size={16} />
				</div>
				<div>
					<div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.label}</div>
					<div className="text-xs text-zinc-500 dark:text-zinc-400">LLM Inference</div>
				</div>
			</div>
			{data.status && (
				<div className="mt-2 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full inline-block">
					{data.status}
				</div>
			)}
			<Handle
				type="source"
				position={Position.Bottom}
				isConnectable={is_connectable}
				className="w-2 h-2 !bg-emerald-500"
			/>
		</div>
	)
}

const output_node = ({ data, is_connectable = true }: { data: { label: string }; is_connectable?: boolean }) => {
	return (
		<div
			className={`px-4 py-3 rounded-lg shadow-sm border border-amber-200 dark:border-amber-900 bg-white dark:bg-zinc-900`}
		>
			<Handle
				type="target"
				position={Position.Top}
				isConnectable={is_connectable}
				className="w-2 h-2 !bg-amber-500"
			/>
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
					<FileText size={16} />
				</div>
				<div>
					<div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.label}</div>
					<div className="text-xs text-zinc-500 dark:text-zinc-400">Response</div>
				</div>
			</div>
		</div>
	)
}

const node_types = {
	data: data_node,
	model: model_node,
	output: output_node
}

const initial_nodes: Node[] = [
	{ id: '1', type: 'data', position: { x: 250, y: 50 }, data: { label: 'Input Dataset' } },
	{
		id: '2',
		type: 'model',
		position: { x: 250, y: 150 },
		data: { label: 'GPT-4 Classifier', status: 'Ready' }
	},
	{ id: '3', type: 'output', position: { x: 250, y: 250 }, data: { label: 'Text Output' } }
]

const initial_edges: Edge[] = [
	{ id: 'e1-2', source: '1', target: '2', animated: true },
	{ id: 'e2-3', source: '2', target: '3' }
]

function get_mini_map_node_color(node: Node, is_dark_mode: boolean): string {
	if (node.type === 'data') return is_dark_mode ? '#4f46e5' : '#818cf8'
	if (node.type === 'model') return is_dark_mode ? '#10b981' : '#34d399'
	if (node.type === 'output') return is_dark_mode ? '#f59e0b' : '#fbbf24'
	return '#eee'
}

function render_execution_status(execution_state: 'idle' | 'running' | 'completed' | 'error') {
	const state_class =
		execution_state === 'completed'
			? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
			: execution_state === 'error'
				? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
				: 'text-zinc-500'
	const state_text =
		execution_state === 'completed'
			? 'Last run: Success'
			: execution_state === 'error'
				? 'Last run: Failed'
				: 'Not run yet'

	return (
		<div className={`px-3 py-1.5 text-xs font-medium rounded ${state_class}`}>
			{state_text}
		</div>
	)
}

function render_model_properties(is_dark_mode: boolean, text_muted: string) {
	const input_cls = `w-full px-3 py-2 rounded-md text-sm border focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
		is_dark_mode
			? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
			: 'bg-white border-zinc-300 text-zinc-900'
	}`

	return (
		<>
			<div>
				<label className={`block text-xs font-medium mb-1 ${text_muted}`}>Model Tier</label>
				<select className={input_cls}>
					<option>GPT-4 Core</option>
					<option>GPT-4 Turbo</option>
					<option>Claude 3 Opus</option>
					<option>Gemini 1.5 Pro</option>
				</select>
			</div>
			<div>
				<label className={`block text-xs font-medium mb-1 ${text_muted}`}>System Prompt</label>
				<textarea
					rows={4}
					className={`${input_cls} resize-none`}
					placeholder="Enter instructions for the model..."
					defaultValue="You are a helpful assistant."
				/>
			</div>
			<div className="flex items-center gap-2">
				<input type="checkbox" id="stream" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
				<label htmlFor="stream" className={`text-sm ${text_muted}`}>Enable Streaming</label>
			</div>
		</>
	)
}

function render_data_properties(is_dark_mode: boolean, text_muted: string) {
	const input_cls = `w-full px-3 py-2 rounded-md text-sm border focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
		is_dark_mode
			? 'bg-zinc-800 border-zinc-700 text-white'
			: 'bg-white border-zinc-300 text-zinc-900'
	}`

	return (
		<div>
			<label className={`block text-xs font-medium mb-1 ${text_muted}`}>Dataset Source</label>
			<select className={input_cls}>
				<option>customer_feedback_q3.csv</option>
				<option>app_reviews_all.json</option>
				<option>support_tickets_resolved.csv</option>
			</select>
		</div>
	)
}

function render_node_properties(
	selected_node: Node | undefined,
	set_nodes: (updater: (nds: Node[]) => Node[]) => void,
	is_dark_mode: boolean,
	text_muted: string
) {
	if (!selected_node) {
		return (
			<div className={`p-8 text-center flex flex-col items-center justify-center h-64 ${text_muted}`}>
				<MOUSE_SQUARE size={32} className="mb-2 opacity-50" />
				<p className="text-sm">Select a node to inspect and edit its properties.</p>
			</div>
		)
	}

	const node_name_cls = `w-full px-3 py-2 rounded-md text-sm border focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
		is_dark_mode
			? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
			: 'bg-white border-zinc-300 text-zinc-900'
	}`

	return (
		<div className="p-4 space-y-6">
			<div>
				<label className={`block text-xs font-medium mb-1 ${text_muted}`}>Node Name</label>
				<input
					type="text"
					value={selected_node.data.label as string}
					onChange={(e) => {
						set_nodes((nds) =>
							nds.map((n) => {
								if (n.id === selected_node.id) {
									n.data = { ...n.data, label: e.target.value }
								}
								return n
							})
						)
					}}
					className={node_name_cls}
				/>
			</div>

			{selected_node.type === 'model' && render_model_properties(is_dark_mode, text_muted)}
			{selected_node.type === 'data' && render_data_properties(is_dark_mode, text_muted)}
		</div>
	)
}

function mouse_square({ size, className }: { size: number; className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="m9 8 4 4-4 4" />
		</svg>
	)
}

const MOUSE_SQUARE = mouse_square

export default function workflow_builder({ is_dark_mode }: workflow_builder_props) {
	const [nodes, set_nodes, on_nodes_change] = useNodesState(initial_nodes)
	const [edges, set_edges, on_edges_change] = useEdgesState(initial_edges)
	const [selected_node, set_selected_node] = useState<Node | undefined>(undefined)
	const [execution_state, set_execution_state] = useState<'idle' | 'running' | 'completed' | 'error'>(
		'idle'
	)

	const on_connect = useCallback(
		(connection_params: Connection) => set_edges((eds) => addEdge(connection_params, eds)),
		[set_edges]
	)

	const on_node_click = (_event: React.MouseEvent, node: Node) => {
		set_selected_node(node)
	}

	const on_pane_click = () => {
		set_selected_node(undefined)
	}

	const handle_run_workflow = () => {
		set_execution_state('running')

		setTimeout(() => {
			set_nodes((nds) =>
				nds.map((n) => {
					if (n.type === 'model') {
						return { ...n, data: { ...n.data, status: 'Processing...' } }
					}
					return n
				})
			)

			setTimeout(() => {
				set_nodes((nds) =>
					nds.map((n) => {
						if (n.type === 'model') {
							return { ...n, data: { ...n.data, status: 'Success' } }
						}
						return n
					})
				)
				set_execution_state('completed')
			}, 1500)
		}, 800)
	}

	const theme_classes = is_dark_mode ? 'bg-[#09090b] text-zinc-200' : 'bg-zinc-50 text-zinc-900'
	const panel_bg = is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	const is_running = execution_state === 'running'
	const run_btn_class = is_running
		? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
		: 'bg-indigo-600 hover:bg-indigo-500 text-white'

	return (
		<div className={`flex w-full h-[calc(100vh-64px)] ${theme_classes}`}>
			<div className="flex-1 h-full relative">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={on_nodes_change}
					onEdgesChange={on_edges_change}
					onConnect={on_connect}
					nodeTypes={node_types}
					onNodeClick={on_node_click}
					onPaneClick={on_pane_click}
					fitView
					colorMode={is_dark_mode ? 'dark' : 'light'}
				>
					<Background color={is_dark_mode ? '#3f3f46' : '#d4d4d8'} gap={16} />
					<Controls
						className={`border ${is_dark_mode ? 'border-zinc-700 bg-zinc-800 fill-zinc-300' : 'border-zinc-200 bg-white fill-zinc-600'}`}
					/>
					<MiniMap
						nodeColor={(n) => get_mini_map_node_color(n, is_dark_mode)}
						maskColor={is_dark_mode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}
						style={{
							backgroundColor: is_dark_mode ? '#18181b' : '#fff',
							border: `1px solid ${is_dark_mode ? '#3f3f46' : '#e4e4e7'}`
						}}
					/>

					<Panel position="top-left" className="m-4">
						<div
							className={`p-2 rounded-lg shadow-sm border flex items-center gap-2 ${panel_bg} backdrop-blur-md bg-opacity-90`}
						>
							<button
								onClick={handle_run_workflow}
								disabled={is_running}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${run_btn_class}`}
							>
								<Play size={14} className={is_running ? 'animate-pulse' : ''} />
								{is_running ? 'Running...' : 'Execute Flow'}
							</button>

							{render_execution_status(execution_state)}
						</div>
					</Panel>
				</ReactFlow>
			</div>

			<div className={`w-80 flex-shrink-0 border-l ${panel_bg} overflow-y-auto z-10`}>
				<div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
					<Settings2 size={18} className={text_muted} />
					<h2 className="font-semibold text-sm">Properties</h2>
				</div>

				{render_node_properties(selected_node, set_nodes, is_dark_mode, text_muted)}
			</div>
		</div>
	)
}
