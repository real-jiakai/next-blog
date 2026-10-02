import type { ComponentPropsWithoutRef, ReactNode } from 'react'

// Glyphs from Google's Material Icons (Apache-2.0), drawn as plain SVG rather
// than through a component library: they cost no client JavaScript and inject
// no runtime styles, and server components can render them.

export interface IconProps extends ComponentPropsWithoutRef<'svg'> {
	/** Pixels at the default root font size; the icon scales with it, as rem does. */
	size?: number
}

function Icon({ size = 20, style, children, ...props }: IconProps & { children: ReactNode }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="1em"
			height="1em"
			fill="currentColor"
			aria-hidden
			{...props}
			style={{ fontSize: `${size / 16}rem`, flexShrink: 0, ...style }}
		>
			{children}
		</svg>
	)
}

export function SearchIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" />
		</Icon>
	)
}

export function KeyboardArrowUpIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
		</Icon>
	)
}

/** The sun the theme toggle shows in light mode (Material's Brightness5). */
export function SunIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M20 15.31 23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6" />
		</Icon>
	)
}

/** The half-shaded sun the theme toggle shows in dark mode (Material's Brightness4). */
export function MoonIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12zM12 18c-.89 0-1.74-.2-2.5-.55C11.56 16.5 13 14.42 13 12s-1.44-4.5-3.5-5.45C10.26 6.2 11.11 6 12 6c3.31 0 6 2.69 6 6s-2.69 6-6 6" />
		</Icon>
	)
}

export function ArticleOutlinedIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M19 5v14H5V5zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2" />
			<path d="M14 17H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z" />
		</Icon>
	)
}

export function NorthEastIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z" />
		</Icon>
	)
}

export function MusicNoteIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
		</Icon>
	)
}
