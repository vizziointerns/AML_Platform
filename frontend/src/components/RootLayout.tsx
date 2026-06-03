import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { use_keyboard_shortcuts } from '../hooks/use_keyboard_shortcuts'
import { use_app_context } from '../contexts/app_context'
import { header_content as HeaderContent } from './header'
import { app_sidebar } from './Sidebar/app_sidebar'

export default function root_layout() {
	const { is_dark_mode } = use_app_context()
	const location = useLocation()
	const navigate = useNavigate()

	const path_parts = location.pathname.split('/').filter(Boolean)
	const project_id = path_parts[0] === 'projects' ? path_parts[1] : undefined
	const is_in_project = !!project_id

	const [is_l1_expanded, set_is_l1_expanded] = useState(!is_in_project)
	const [is_l1_hovered, set_is_l1_hovered] = useState(false)

	use_keyboard_shortcuts(true, () => set_is_l1_expanded((prev) => !prev))

	useEffect(() => {
		function update_expanded() {
			if (window.innerWidth < 1024) {
				set_is_l1_expanded(false)
			} else {
				set_is_l1_expanded(!is_in_project)
			}
		}

		update_expanded()

		window.addEventListener('resize', update_expanded)
		return () => window.removeEventListener('resize', update_expanded)
	}, [is_in_project])

	return (
		<>
			<div
				onMouseEnter={() => set_is_l1_hovered(true)}
				onMouseLeave={() => set_is_l1_hovered(false)}
			>
				{app_sidebar({
					is_expanded: is_l1_expanded,
					is_hover_expanded: is_in_project && is_l1_hovered && !is_l1_expanded,
					is_hovered: is_l1_hovered,
					on_toggle: () => set_is_l1_expanded((prev) => !prev),
					on_navigate: (route) => {
						navigate(`/${route}`)
					},
					on_logo_click: () => navigate('/home'),
					is_dark_mode
				})}
			</div>

			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				<HeaderContent />

				<div className="flex flex-1 min-w-0 overflow-hidden">
					<Outlet context={{ is_in_project, project_id }} />
				</div>
			</div>
		</>
	)
}
