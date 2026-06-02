import React from 'react'

export const input_field = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }
>(({ className, icon, ...props }, ref) => {
	return (
		<div className="relative">
			{icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</div>}
			<input
				ref={ref}
				className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${icon ? 'pl-10' : ''} ${className}`}
				{...props}
			/>
		</div>
	)
})

export const button_component = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
		isLoading?: boolean
	}
>(({ className, variant = 'primary', isLoading, children, ...props }, ref) => {
	const variants = {
		primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]',
		secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white',
		outline: 'border border-zinc-800 hover:bg-zinc-800 text-zinc-300',
		ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
	}
	return (
		<button
			ref={ref}
			className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
			disabled={isLoading || props.disabled}
			{...props}
		>
			{isLoading ? (
				<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
			) : (
				children
			)}
		</button>
	)
})

export const social_button = ({
	icon,
	provider,
	onClick
}: {
	icon: React.ReactNode
	provider: string
	onClick?: () => void
}) => (
	<button
		type="button"
		onClick={onClick}
		className="w-full flex items-center justify-center gap-3 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors"
	>
		{icon}
		Continue with {provider}
	</button>
)
