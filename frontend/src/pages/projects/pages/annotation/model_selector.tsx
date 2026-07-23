import { Loader2 } from 'lucide-react'

export interface ModelOption {
	id: number
	name: string
	task_type: string
	accuracy: number | undefined
}

export function render_model_selection_dialog(
	is_open: boolean,
	custom_models: ModelOption[],
	selected_model_id: number | undefined,
	set_selected_model_id: (id: number | undefined) => void,
	on_confirm: () => void,
	on_cancel: () => void,
	is_running: boolean,
	text_muted: string,
	text_heading: string,
	bg_panel: string,
	border_subtle: string,
	bg_hover: string,
	sam3_prompt: string,
	set_sam3_prompt: (v: string) => void
) {
	if (!is_open) return undefined

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
			<div
				className={`rounded-lg shadow-xl border ${border_subtle} ${bg_panel} w-full max-w-md p-6`}
			>
				<h2 className={`text-lg font-semibold mb-4 ${text_heading}`}>
					Select Model for Auto Detection
				</h2>

				<label
					className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
						selected_model_id === -1 ? 'border-indigo-500 bg-indigo-50/10' : border_subtle
					} ${bg_hover}`}
				>
					<input
						type="radio"
						name="model"
						checked={selected_model_id === -1}
						onChange={() => set_selected_model_id(-1)}
						className="accent-indigo-500"
					/>
					<div>
						<div className={`text-sm font-medium ${text_heading}`}>SAM 2</div>
						<div className={`text-xs ${text_muted}`}>Segment Anything Model 2.1</div>
					</div>
				</label>

				<label
					className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
						selected_model_id === -2 ? 'border-indigo-500 bg-indigo-50/10' : border_subtle
					} ${bg_hover}`}
				>
					<input
						type="radio"
						name="model"
						checked={selected_model_id === -2}
						onChange={() => set_selected_model_id(-2)}
						className="accent-indigo-500"
					/>
					<div>
						<div className={`text-sm font-medium ${text_heading}`}>SAM 3</div>
						<div className={`text-xs ${text_muted}`}>Promptable Concept Segmentation</div>
					</div>
				</label>

				{selected_model_id === -2 && (
					<input
						type="text"
						value={sam3_prompt}
						onChange={(e) => set_sam3_prompt(e.target.value)}
						placeholder="Text prompt — e.g. car, person wearing hat, ..."
						className={`w-full mt-2 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${border_subtle} ${bg_hover}`}
						autoFocus
					/>
				)}

				<label
					className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
						selected_model_id === undefined ? 'border-indigo-500 bg-indigo-50/10' : border_subtle
					} ${bg_hover}`}
				>
					<input
						type="radio"
						name="model"
						checked={selected_model_id === undefined}
						onChange={() => set_selected_model_id(undefined)}
						className="accent-indigo-500"
					/>
					<div>
						<div className={`text-sm font-medium ${text_heading}`}>Default Model</div>
						<div className={`text-xs ${text_muted}`}>YOLO11n COCO Pretrained</div>
					</div>
				</label>

				<div className="mt-3">
					<div className={`text-sm font-medium mb-2 ${text_heading}`}>Custom Models</div>
					{custom_models.length === 0 ? (
						<p className={`text-xs ${text_muted} italic p-2`}>
							No trained models available. Using Default YOLO11n COCO Model.
						</p>
					) : (
						<div className="space-y-2">
							{custom_models.map((model) => (
								<label
									key={model.id}
									className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
										selected_model_id === model.id
											? 'border-indigo-500 bg-indigo-50/10'
											: border_subtle
									} ${bg_hover}`}
								>
									<input
										type="radio"
										name="model"
										checked={selected_model_id === model.id}
										onChange={() => set_selected_model_id(model.id)}
										className="accent-indigo-500"
									/>
									<div>
										<div className={`text-sm font-medium ${text_heading}`}>{model.name}</div>
										<div className={`text-xs ${text_muted}`}>
											{model.task_type}
											{model.accuracy !== undefined
												? ` • Acc: ${(model.accuracy * 100).toFixed(1)}%`
												: ''}
										</div>
									</div>
								</label>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-end gap-3 mt-6">
					<button
						onClick={on_cancel}
						disabled={is_running}
						className={`px-4 py-2 rounded-md text-sm font-medium border ${border_subtle} ${text_muted} ${bg_hover} transition-colors disabled:opacity-50`}
					>
						Cancel
					</button>
					<button
						onClick={on_confirm}
						disabled={is_running}
						className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						{is_running ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Running...
							</>
						) : (
							'Run Detection'
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
