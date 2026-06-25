import { useState, useCallback, useEffect, useRef } from 'react'

const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_ACCESS_TOKEN_KEY = 'google_drive_access_token'
const GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY = 'google_drive_access_token_expires_at'

function get_client_id(): string | undefined {
	return import.meta.env.VITE_GOOGLE_CLIENT_ID
}

interface GoogleOAuthResponse {
	access_token: string
	expires_in: number
	scope: string
	token_type: string
}

interface GoogleAuthError {
	error: string
	error_description?: string
}

interface UseGoogleAuthResult {
	access_token: string | undefined
	is_authenticated: boolean
	is_loading: boolean
	is_configured: boolean
	sign_in: () => void
	sign_out: () => void
	refresh_token: () => Promise<string | undefined>
	error: string | undefined
}

function clear_google_access_token_storage_internal(): void {
	try {
		window.localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY)
		window.localStorage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY)
	} catch {
		/* ignore */
	}
}

function read_stored_google_access_token(): string | undefined {
	try {
		const access_token = window.localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY) ?? undefined
		const expires_at_raw =
			window.localStorage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY) ?? undefined
		const expires_at = expires_at_raw ? Number(expires_at_raw) : Number.NaN

		if (!access_token || !Number.isFinite(expires_at) || Date.now() >= expires_at) {
			clear_google_access_token_storage_internal()
			return undefined
		}

		return access_token
	} catch {
		return undefined
	}
}

function persist_google_access_token(access_token: string, expires_in: number): void {
	try {
		window.localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, access_token)
		window.localStorage.setItem(
			GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY,
			String(Date.now() + expires_in * 1000)
		)
	} catch {
		/* ignore */
	}
}

export function clear_google_access_token_storage(): void {
	clear_google_access_token_storage_internal()
}

function init_token_client(
	config: Record<string, unknown>
): { requestAccessToken: () => void } | undefined {
	const g = globalThis as Record<string, unknown>
	const google = g.google as Record<string, unknown> | undefined
	const accounts = google?.accounts as Record<string, unknown> | undefined
	const oauth2 = accounts?.oauth2 as
		| { initTokenClient: (config: Record<string, unknown>) => { requestAccessToken: () => void } }
		| undefined

	return oauth2?.initTokenClient(config)
}

export function use_google_auth(): UseGoogleAuthResult {
	const [access_token, set_access_token] = useState<string | undefined>(() =>
		read_stored_google_access_token()
	)
	const [is_loading, set_is_loading] = useState(false)
	const [error, set_error] = useState<string | undefined>()

	const client_id = get_client_id()
	const is_configured = !!client_id
	const silent_refresh_ref = useRef<() => void>(() => {})

	const handle_token_response = useCallback((response: GoogleOAuthResponse | GoogleAuthError) => {
		if ('error' in response) {
			set_error(response.error_description ?? response.error)
			set_access_token(undefined)
			clear_google_access_token_storage_internal()
			set_is_loading(false)
			return
		}
		set_access_token(response.access_token)
		persist_google_access_token(response.access_token, response.expires_in)
		set_error(undefined)
		set_is_loading(false)

		/* schedule silent refresh before token expires */
		const expires_ms = (response.expires_in - 60) * 1000
		if (expires_ms > 0) {
			setTimeout(
				() => {
					silent_refresh_ref.current()
				},
				Math.min(expires_ms, 55 * 60 * 1000)
			)
		}
	}, [])

	const silent_refresh = useCallback(() => {
		if (!client_id) return

		const client = init_token_client({
			client_id: client_id,
			scope: SCOPES,
			prompt: '',
			callback: handle_token_response,
			error_callback: () => {
				/* silent failure */
			}
		})

		client?.requestAccessToken()
	}, [client_id, handle_token_response])

	silent_refresh_ref.current = silent_refresh

	const sign_in = useCallback(() => {
		if (!client_id) {
			set_error('Google Client ID not configured')
			return
		}

		set_is_loading(true)
		set_error(undefined)

		const client = init_token_client({
			client_id: client_id,
			scope: SCOPES,
			callback: handle_token_response,
			error_callback: (err: GoogleAuthError) => {
				set_error(err.error_description ?? err.error)
				set_is_loading(false)
			}
		})

		if (!client) {
			set_error('Google Identity Services not loaded')
			set_is_loading(false)
			return
		}

		client.requestAccessToken()
	}, [client_id, handle_token_response])

	const sign_out = useCallback(() => {
		set_access_token(undefined)
		set_error(undefined)
		clear_google_access_token_storage_internal()
	}, [])

	useEffect(() => {
		if (!is_configured) {
			set_error('VITE_GOOGLE_CLIENT_ID not configured')
		}
	}, [is_configured])

	const refresh_token = useCallback((): Promise<string | undefined> => {
		return new Promise((resolve) => {
			if (!client_id) {
				resolve(undefined)
				return
			}

			const handle = (response: GoogleOAuthResponse | GoogleAuthError) => {
				if ('error' in response) {
					resolve(undefined)
					return
				}
				set_access_token(response.access_token)
				persist_google_access_token(response.access_token, response.expires_in)
				set_error(undefined)
				resolve(response.access_token)
			}

			const client = init_token_client({
				client_id: client_id,
				scope: SCOPES,
				prompt: '',
				callback: handle,
				error_callback: () => {
					resolve(undefined)
				}
			})

			client?.requestAccessToken()
		})
	}, [client_id])

	return {
		access_token,
		is_authenticated: !!access_token,
		is_loading,
		is_configured,
		sign_in,
		sign_out,
		refresh_token,
		error
	}
}
