import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthFlow from './pages/AuthFlow'
import Uploader from './components/Uploader'
import { APP_CONTEXT } from './contexts/app_context'
import type { AppContextValue } from './contexts/app_context'
import RootLayout from './components/RootLayout'
import HomeShell from './pages/Home/Shell'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectRouter from './pages/projects/ProjectRouter'
import PagePlaceholder from './components/page_placeholder'
import { useAuth } from './contexts/auth_context'

export default function app() {
	const { session, loading } = useAuth()
	const is_authenticated = !!session
	const [is_dark_mode, set_is_dark_mode] = useState(true)
	const [is_mobile_menu_open, set_is_mobile_menu_open] = useState(false)
	const [is_uploader_open, set_is_uploader_open] = useState(false)

	const theme_classes = is_dark_mode
		? 'bg-[#09090b] text-zinc-200 selection:bg-blue-500/30'
		: 'bg-zinc-50 text-zinc-900 selection:bg-blue-500/30'

	const context_value: AppContextValue = {
		is_dark_mode,
		toggle_theme: () => set_is_dark_mode((prev) => !prev),
		open_uploader: () => set_is_uploader_open(true),
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

	if (loading) {
		return (
			<div className={`flex h-screen w-full items-center justify-center ${theme_classes}`}>
				<div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		)
	}

	return (
		<Routes>
			<Route
				path="/login"
				element={
					is_authenticated ? (
						<Navigate to="/home" replace />
					) : (
						<AuthFlow on_complete={() => {}} />
					)
				}
			/>
			<Route
				path="/signup"
				element={
					is_authenticated ? (
						<Navigate to="/home" replace />
					) : (
						<AuthFlow on_complete={() => {}} />
					)
				}
			/>
			<Route
				path="/forgot"
				element={
					is_authenticated ? (
						<Navigate to="/home" replace />
					) : (
						<AuthFlow on_complete={() => {}} />
					)
				}
			/>
			<Route
				path="/*"
				element={
					is_authenticated ? (
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
								on_close={() => set_is_uploader_open(false)}
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
