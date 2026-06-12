export interface VirtualGalleryProps {
	is_dark_mode: boolean
}

export interface MockImage {
	id: string | number
	status: string
	classes: string[]
	width: number
	height: number
	url: string
}
