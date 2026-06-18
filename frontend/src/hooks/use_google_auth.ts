import { useState, useCallback, useEffect, useRef } from 'react'

const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_ACCESS_TOKEN_KEY = 'google_drive_access_token'
const GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY = 'google_drive_access_token_expires_at'

function get_client_id(): string | undefined {
	return import.meta.env.VITE_GOOGLE_CLIENT_ID
}

interface GoogleAccountsGlobal {
	google?: {
		accounts?: {
			oauth2?: {
				initTokenClient: (config: Record<string, unknown>) => { requestAccessToken: () => void }
			}
		}
	}
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
	error: string | undefined
}

function clear_google_access_token_storage_internal(): void {
	try {
		window.sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY)
		window.sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY)
	} catch {
		/* ignore */
	}
}

function read_stored_google_access_token(): string | undefined {
	try {
		const access_token = window.sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY) ?? undefined
		const expires_at_raw =
			window.sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY) ?? undefined
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
		window.sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, access_token)
		window.sessionStorage.setItem(
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

export function use_google_auth(): UseGoogleAuthResult {
	const [access_token, set_access_token] = useState<string | undefined>(() =>
		read_stored_google_access_token()
	)
	const [is_loading, set_is_loading] = useState(false)
	const [error, set_error] = useState<string | undefined>()

	const client_id = get_client_id()
	const is_configured = !!client_id
	const sign_in_ref = useRef<() => void>(() => {})

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

		/* auto-refresh before token expires */
		const expires_ms = (response.expires_in - 60) * 1000
		if (expires_ms > 0) {
			setTimeout(
				() => {
					sign_in_ref.current()
				},
				Math.min(expires_ms, 55 * 60 * 1000)
			)
		}
	}, [])

	const sign_in = useCallback(() => {
		if (!client_id) {
			set_error('Google Client ID not configured')
			return
		}

		const token_client = (globalThis as unknown as GoogleAccountsGlobal).google?.accounts?.oauth2

		if (!token_client) {
			set_error('Google Identity Services not loaded')
			return
		}

		set_is_loading(true)
		set_error(undefined)

		const client = token_client.initTokenClient({
			client_id: client_id,
			scope: SCOPES,
			callback: handle_token_response,
			error_callback: (err: GoogleAuthError) => {
				set_error(err.error_description ?? err.error)
				set_is_loading(false)
			}
		})

		client.requestAccessToken()
	}, [client_id, handle_token_response])

	sign_in_ref.current = sign_in

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

	return {
		access_token,
		is_authenticated: !!access_token,
		is_loading,
		is_configured,
		sign_in,
		sign_out,
		error
	}
}
