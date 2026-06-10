import { useCallback } from 'react'

interface PickerDoc {
	id: string
	name: string
	url?: string
	embedUrl?: string
	mimeType?: string
}

interface PickerData {
	action: string
	docs: PickerDoc[]
}

interface PickerBuilderInstance {
	enableFeature: (feature: unknown) => PickerBuilderInstance
	setAppId: (id: string) => PickerBuilderInstance
	setOAuthToken: (token: string) => PickerBuilderInstance
	addView: (view: unknown) => PickerBuilderInstance
	setCallback: (cb: (data: PickerData) => void) => PickerBuilderInstance
	build: () => { setVisible: (visible: boolean) => void }
}

interface GapiPicker {
	View: new (viewId: unknown) => unknown
	ViewId: { DOCS_IMAGES: unknown; DOCS_VIDEOS: unknown }
	PickerBuilder: new () => PickerBuilderInstance
	Feature: { MULTISELECT_ENABLED: unknown }
}

interface GoogleGlobal {
	picker: GapiPicker
}

interface GapiGlobal {
	client: unknown
}

interface WindowWithGoogle {
	gapi?: GapiGlobal
	google?: GoogleGlobal
}

interface GooglePickerResult {
	open_picker: () => void
	is_available: boolean
}

export function use_google_picker(
	on_files_selected: (files: { id: string; name: string; url: string; mime_type: string }[]) => void
): GooglePickerResult {
	const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID
	const api_key = import.meta.env.VITE_GOOGLE_API_KEY
	const is_available = !!(client_id && api_key)

	const open_picker = useCallback(() => {
		if (!is_available) {
			return
		}

		const win = globalThis as unknown as WindowWithGoogle

		if (!win.gapi) {
			console.warn('Google API client not loaded')
			return
		}

		if (!win.google) {
			console.warn('Google Picker API not loaded')
			return
		}

		const { google } = win
		const view = new google.picker.View(google.picker.ViewId.DOCS_IMAGES)

		const picker = new google.picker.PickerBuilder()
			.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
			.setAppId(client_id!)
			.setOAuthToken(api_key!)
			.addView(view)
			.addView(google.picker.ViewId.DOCS_VIDEOS)
			.setCallback((data: PickerData) => {
				if (data.action === 'picked') {
					const files = data.docs.map((doc: PickerDoc) => ({
						id: doc.id,
						name: doc.name,
						url: doc.url ?? doc.embedUrl ?? '',
						mime_type: doc.mimeType ?? ''
					}))
					on_files_selected(files)
				}
			})
			.build()

		picker.setVisible(true)
	}, [client_id, api_key, is_available, on_files_selected])

	return { open_picker, is_available }
}
