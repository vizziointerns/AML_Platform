import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CheckCircle2, X } from 'lucide-react'
import AuthFlow from './pages/AuthFlow'
import Uploader from './components/Uploader'
import CreateProjectWizard from './components/CreateProjectWizard'
import { APP_CONTEXT } from './contexts/app_context'
import type { AppContextValue } from './contexts/app_context'
import { auth_provider as AuthProvider, use_auth } from './contexts/auth_context'
import RootLayout from './components/RootLayout'
import HomeShell from './pages/Home/Shell'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectRouter from './pages/projects/ProjectRouter'
import PagePlaceholder from './components/page_placeholder'

interface Toast {
	id: string
	message: string
}

function app_content() {
	const { user, is_loading } = use_auth()
	const [is_dark_mode, set_is_dark_mode] = useState(true)
	const [is_mobile_menu_open, set_is_mobile_menu_open] = useState(false)
	const [is_uploader_open, set_is_uploader_open] = useState(false)
	const [upload_initial_dataset_id, set_upload_initial_dataset_id] = useState<string | undefined>(
		undefined
	)
	const [is_new_project_open, set_is_new_project_open] = useState(false)
	const [toasts, set_toasts] = useState<Toast[]>([])

	useEffect(() => {
		const on_upload_complete = (e: Event) => {
			const detail = (e as CustomEvent).detail as { completed: number; total: number }
			let id: string
			try {
				id = crypto.randomUUID()
			} catch {
				id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
			}
			set_toasts((prev) => [
				...prev,
				{ id, message: `Upload complete: ${detail.completed}/${detail.total} files` }
			])
			setTimeout(() => set_toasts((prev) => prev.filter((t) => t.id !== id)), 4000)
		}
		window.addEventListener('upload-complete', on_upload_complete)
		return () => window.removeEventListener('upload-complete', on_upload_complete)
	}, [])

	const theme_classes = is_dark_mode
		? 'bg-[#09090b] text-zinc-200 selection:bg-blue-500/30'
		: 'bg-zinc-50 text-zinc-900 selection:bg-blue-500/30'

	const context_value: AppContextValue = {
		is_dark_mode,
		toggle_theme: () => set_is_dark_mode((prev) => !prev),
		open_uploader: (datasetId?: string) => {
			set_upload_initial_dataset_id(datasetId)
			set_is_uploader_open(true)
		},
		open_new_project: () => set_is_new_project_open(true),
		is_mobile_menu_open,
		open_mobile_menu: () => set_is_mobile_menu_open(true),
		close_mobile_menu: () => set_is_mobile_menu_open(false)
	}

	useEffect(() => {
		if (is_dark_mode) {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}, [is_dark_mode])

	if (is_loading) {
		return (
			<div className="h-screen w-full bg-[#09090b] flex items-center justify-center">
				<div className="loading-spinner" />
			</div>
		)
	}

	return (
		<Routes>
			<Route path="/login" element={user ? <Navigate to="/home" replace /> : <AuthFlow />} />
			<Route path="/signup" element={user ? <Navigate to="/home" replace /> : <AuthFlow />} />
			<Route path="/forgot" element={user ? <Navigate to="/home" replace /> : <AuthFlow />} />
			<Route
				path="/*"
				element={
					user ? (
						<APP_CONTEXT.Provider value={context_value}>
							<div className={`flex h-screen w-full overflow-hidden font-sans ${theme_classes}`}>
								<Routes>
									<Route path="/" element={<RootLayout />}>
										<Route index element={<Navigate to="/home" replace />} />
										<Route path="home" element={<HomeShell />} />
										<Route path="projects" element={<ProjectsPage />} />
										<Route path="projects/:projectId/*" element={<ProjectRouter />} />
										<Route path="settings" element={<PagePlaceholder />} />
										<Route path="*" element={<Navigate to="/home" replace />} />
									</Route>
								</Routes>
							</div>

							<Uploader
								isOpen={is_uploader_open}
								on_close={() => {
									set_is_uploader_open(false)
									set_upload_initial_dataset_id(undefined)
								}}
								is_dark_mode={is_dark_mode}
								initial_dataset_id={upload_initial_dataset_id}
							/>

							{toasts.length > 0 && (
								<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-sm w-full px-4">
									{toasts.map((t) => (
										<div
											key={t.id}
											className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-top-2 fade-in duration-300 ${
												is_dark_mode
													? 'bg-emerald-900/90 border-emerald-700 text-emerald-200'
													: 'bg-emerald-50 border-emerald-200 text-emerald-800'
											}`}
										>
											<CheckCircle2 size={18} className="shrink-0" />
											<span className="text-sm font-medium flex-1">{t.message}</span>
											<button
												onClick={() => set_toasts((prev) => prev.filter((x) => x.id !== t.id))}
												className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
											>
												<X size={14} />
											</button>
										</div>
									))}
								</div>
							)}

							<CreateProjectWizard
								isOpen={is_new_project_open}
								on_close={() => set_is_new_project_open(false)}
								is_dark_mode={is_dark_mode}
							/>

							<style
								dangerouslySetInnerHTML={{
									__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `
								}}
							/>
						</APP_CONTEXT.Provider>
					) : (
						<Navigate to="/login" replace />
					)
				}
			/>
		</Routes>
	)
}

export default function app() {
	return <AuthProvider>{React.createElement(app_content)}</AuthProvider>
}
