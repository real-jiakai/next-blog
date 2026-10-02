declare module 'identicon.js' {
	interface IdenticonOptions {
		foreground?: [number, number, number, number?]
		background?: [number, number, number, number?]
		margin?: number
		size?: number
		format?: 'png' | 'svg'
		saturation?: number
		brightness?: number
	}

	class Identicon {
		constructor(hash: string, options?: IdenticonOptions)
		/** Base64 image data, or the raw SVG/PNG dump when `raw` is true. */
		toString(raw?: boolean): string
	}

	export = Identicon
}
