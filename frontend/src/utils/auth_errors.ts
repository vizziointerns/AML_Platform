export function format_auth_error(message: string): string {
	if (message.includes('Password should be at least 6 characters')) {
		return 'Password must be at least 6 characters with uppercase, lowercase, and a number'
	}
	if (message.includes('Email link is invalid or has expired')) {
		return 'This link is invalid or has expired. Please try again.'
	}
	if (message.includes('Invalid login credentials')) {
		return 'Invalid email or password'
	}
	if (message.includes('Email not confirmed')) {
		return 'Please confirm your email before signing in'
	}
	if (message.includes('User already registered')) {
		return 'An account with this email already exists'
	}
	if (message.includes('Rate limit exceeded')) {
		return 'Too many attempts. Please wait a moment and try again.'
	}
	return message
}
