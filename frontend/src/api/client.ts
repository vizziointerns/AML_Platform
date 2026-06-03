import axios from 'axios'

let _token_getter: (() => string | undefined) | undefined

export function set_token_getter(getter: () => string | undefined) {
	_token_getter = getter
}

export const api_client = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
	timeout: 15_000,
	headers: { 'Content-Type': 'application/json' }
})

api_client.interceptors.request.use(
	(config) => {
		const token = _token_getter?.()
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => Promise.reject(error)
)

api_client.interceptors.response.use(
	(response) => response,
	(error) => {
		if (axios.isCancel(error)) {
			return Promise.reject(error)
		}

		const status = error.response?.status
		const message =
			status === 401
				? 'Session expired. Please sign in again.'
				: status === 403
					? 'You do not have permission to perform this action.'
					: status === 404
						? 'The requested resource was not found.'
						: status === 429
							? 'Too many requests. Please try again later.'
							: status && status >= 500
								? 'Server error. Please try again later.'
								: 'An unexpected error occurred. Please try again.'

		console.error(`[API Error ${status ?? 'unknown'}]`, error.message)

		const enhanced = new Error(message)
		enhanced.cause = error
		return Promise.reject(enhanced)
	}
)
