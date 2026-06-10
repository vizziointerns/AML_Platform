import { useState, useCallback, useEffect, useRef } from 'react'

const SCOPES = 'https://www.googleapis.com/auth/drive.file'

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

export function use_google_auth(): UseGoogleAuthResult {
	const [access_token, set_access_token] = useState<string | undefined>()
	const [is_loading, set_is_loading] = useState(false)
	const [error, set_error] = useState<string | undefined>()

	const client_id = get_client_id()
	const is_configured = !!client_id
	const sign_in_ref = useRef<() => void>(() => {})

	const handle_token_response = useCallback((response: GoogleOAuthResponse | GoogleAuthError) => {
		if ('error' in response) {
			set_error(response.error_description ?? response.error)
			set_access_token(undefined)
			set_is_loading(false)
			return
		}
		set_access_token(response.access_token)
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
