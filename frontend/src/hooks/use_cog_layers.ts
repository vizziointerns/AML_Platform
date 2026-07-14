import { useState, useCallback } from 'react'
import type { CogLayerInfo } from '../components/AnnotationCanvas/types'

export function use_cog_layers() {
	const [cog_layers, set_cog_layers] = useState<CogLayerInfo[]>([])
	const [is_add_cog_open, set_is_add_cog_open] = useState(false)
	const [new_cog_url, set_new_cog_url] = useState('')

	const handle_add_cog_layer = useCallback(() => {
		if (!new_cog_url.trim()) return
		const id = 'cog_' + crypto.randomUUID().slice(0, 8)
		set_cog_layers((prev) => [
			...prev,
			{
				id,
				url: new_cog_url.trim(),
				name: new_cog_url.split('/').pop()?.split('?')[0] ?? 'COG Layer',
				visible: true,
				opacity: 100,
				band: 0,
				palette: 'grayscale',
				composite_mode: 'single'
			}
		])
		set_new_cog_url('')
		set_is_add_cog_open(false)
	}, [new_cog_url])

	const handle_update_cog_layer = useCallback((id: string, patch: Partial<CogLayerInfo>) => {
		set_cog_layers((prev) =>
			prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))
		)
	}, [])

	const handle_remove_cog_layer = useCallback((id: string) => {
		set_cog_layers((prev) => prev.filter((layer) => layer.id !== id))
	}, [])

	const set_background_image = useCallback((url: string, name: string) => {
		set_cog_layers((prev) => {
			const bg = prev.find((l) => l.id === 'background')
			if (bg) {
				return prev.map((l) => (l.id === 'background' ? { ...l, url, name, visible: true } : l))
			}
			return [
				{
					id: 'background',
					url,
					name,
					visible: true,
					opacity: 100,
					band: 0,
					palette: 'grayscale',
					composite_mode: 'single'
				},
				...prev.filter((l) => l.id !== 'background')
			]
		})
	}, [])

	return {
		cog_layers,
		set_cog_layers,
		is_add_cog_open,
		set_is_add_cog_open,
		new_cog_url,
		set_new_cog_url,
		handle_add_cog_layer,
		handle_update_cog_layer,
		handle_remove_cog_layer,
		set_background_image
	}
}
