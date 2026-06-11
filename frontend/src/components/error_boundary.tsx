import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	has_error: boolean
	error?: Error
}

export default class error_boundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { has_error: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { has_error: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error('[ErrorBoundary]', error, info.componentStack)
	}

	render() {
		if (this.state.has_error) {
			if (this.props.fallback) return this.props.fallback
			return (
				<div className="flex-1 overflow-y-auto p-8">
					<div className="max-w-2xl mx-auto mt-12">
						<h2 className="text-xl font-semibold text-red-500 mb-2">Something went wrong</h2>
						<p className="text-zinc-400 text-sm mb-4">
							{this.state.error?.message ?? 'Unknown error'}
						</p>
						<details className="text-xs text-zinc-500">
							<summary>Stack trace</summary>
							<pre className="mt-2 whitespace-pre-wrap">{this.state.error?.stack}</pre>
						</details>
						<button
							onClick={() => window.location.reload()}
							className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
						>
							Reload page
						</button>
					</div>
				</div>
			)
		}
		return this.props.children
	}
}
