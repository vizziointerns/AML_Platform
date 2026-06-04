import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../utils/supabase'
import type { User, AuthError } from '@supabase/supabase-js'

export interface AuthContextValue {
	user: User | undefined
	is_loading: boolean
	sign_in: (email: string, password: string) => Promise<{ error: AuthError | null }>
	sign_up: (email: string, password: string) => Promise<{ error: AuthError | null }>
	sign_out: () => Promise<void>
}

const AUTH_CONTEXT = createContext<AuthContextValue | undefined>(undefined)

export function auth_provider({ children }: { children: ReactNode }) {
	const [user, set_user] = useState<User | undefined>(undefined)
	const [is_loading, set_is_loading] = useState(true)

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			set_user(session?.user ?? undefined)
			set_is_loading(false)
		})

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			set_user(session?.user ?? undefined)
		})

		return () => subscription.unsubscribe()
	}, [])

	async function sign_in(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({ email, password })
		return { error }
	}

	async function sign_up(email: string, password: string) {
		const { error } = await supabase.auth.signUp({ email, password })
		return { error }
	}

	async function sign_out() {
		await supabase.auth.signOut()
	}

	return (
		<AUTH_CONTEXT.Provider value={{ user, is_loading, sign_in, sign_up, sign_out }}>
			{children}
		</AUTH_CONTEXT.Provider>
	)
}

export function use_auth(): AuthContextValue {
	const ctx = useContext(AUTH_CONTEXT)
	if (!ctx) {
		throw new Error('use_auth must be used within AuthProvider')
	}
	return ctx
}
