import { create } from 'zustand'

export type AppRoute = 'home' | 'projects' | 'settings'
export type ProjectRoute =
	| 'dashboard'
	| 'datasets'
	| 'annotation'
	| 'models'
	| 'training'
	| 'workflow'
	| 'deployment'

interface NavigationState {
	appRoute: AppRoute
	projectRoute: ProjectRoute
	activeProjectId: string | undefined

	setAppRoute: (route: AppRoute) => void
	setProjectRoute: (route: ProjectRoute) => void
	enterProject: (id: string, route?: ProjectRoute) => void
	leaveProject: () => void
}

export const use_navigation_store = create<NavigationState>((set) => ({
	appRoute: 'home',
	projectRoute: 'dashboard',
	activeProjectId: undefined,

	setAppRoute: (route) => set({ appRoute: route }),
	setProjectRoute: (route) => set({ projectRoute: route }),
	enterProject: (id, route = 'dashboard') => set({ activeProjectId: id, projectRoute: route }),
	leaveProject: () => set({ activeProjectId: undefined, projectRoute: 'dashboard' })
}))
