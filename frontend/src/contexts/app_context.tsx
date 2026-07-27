import { createContext, useContext } from 'react'

export interface UploaderOptions {
	folder_only?: boolean
	title?: string
}

export interface AppContextValue {
	is_dark_mode: boolean
	toggle_theme: () => void
	open_uploader: (datasetId?: string, options?: UploaderOptions) => void
	open_new_project: () => void
	is_mobile_menu_open: boolean
	open_mobile_menu: () => void
	close_mobile_menu: () => void
}

export const APP_CONTEXT = createContext<AppContextValue | undefined>(undefined)

export function use_app_context(): AppContextValue {
	const ctx = useContext(APP_CONTEXT)
	if (!ctx) {
		throw new Error('use_app_context must be used within AppContext.Provider')
	}
	return ctx
}
