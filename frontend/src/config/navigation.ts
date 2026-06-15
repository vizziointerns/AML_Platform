import type { ElementType } from 'react'
import {
	LayoutDashboard,
	Database,
	PenTool,
	Box,
	Cpu,
	Rocket,
	GitBranch,
	Home,
	Layers,
	Settings,
	UserCircle
} from 'lucide-react'

export interface NavItem {
	id: string
	label: string
	icon: ElementType
}

export const APP_NAV_ITEMS: NavItem[] = [
	{ id: 'home', label: 'Home', icon: Home },
	{ id: 'projects', label: 'Projects', icon: Layers },
	{ id: 'datasets', label: 'Datasets', icon: Database }
]

export const APP_BOTTOM_ITEMS: NavItem[] = [
	{ id: 'settings', label: 'Settings', icon: Settings },
	{ id: 'account', label: 'Account', icon: UserCircle }
]

export const PROJECT_NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ id: 'datasets', label: 'Datasets', icon: Database },
	{ id: 'annotation', label: 'Annotation', icon: PenTool }
]

export const PROJECT_ML_ITEMS: NavItem[] = [
	{ id: 'models', label: 'Models', icon: Box },
	{ id: 'training', label: 'Training', icon: Cpu },
	{ id: 'deployment', label: 'Deployment', icon: Rocket },
	{ id: 'workflow', label: 'Workflow', icon: GitBranch }
]
