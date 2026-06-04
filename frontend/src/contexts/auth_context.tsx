import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../config/supabase'

interface AuthContextType {
	session: Session | undefined
	user: User | undefined
	is_loading: boolean
	sign_out: () => Promise<void>
}

const auth_context = createContext<AuthContextType>({
	session: undefined,
	user: undefined,
	is_loading: true,
	sign_out: async () => {}
})

export const auth_provider = ({ children }: { children: React.ReactNode }) => {
	const [session, set_session] = useState<Session | undefined>(undefined)
	const [user, set_user] = useState<User | undefined>(undefined)
	const [is_loading, set_is_loading] = useState(true)

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			set_session(session || undefined)
			set_user(session?.user || undefined)
			set_is_loading(false)
		})

		// Listen for auth changes
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			set_session(session || undefined)
			set_user(session?.user || undefined)
			set_is_loading(false)
		})

		return () => subscription.unsubscribe()
	}, [])

	const sign_out = async () => {
		await supabase.auth.signOut()
	}

	return (
		<auth_context.Provider value={{ session, user, is_loading, sign_out }}>
			{children}
		</auth_context.Provider>
	)
}

export const use_auth = () => {
	return useContext(auth_context)
}
