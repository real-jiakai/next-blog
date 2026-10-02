import type { ComponentPropsWithoutRef, ReactNode } from 'react'

// Glyphs from Google's Material Icons (Apache-2.0), apart from the archive box,
// drawn as plain SVG rather than through a component library: they cost no
// client JavaScript and inject no runtime styles, and server components can
// render them.

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

export function HomeIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
		</Icon>
	)
}

export function ArchiveIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z" />
		</Icon>
	)
}

export function InfoIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z" />
		</Icon>
	)
}

export function RssFeedIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="6.18" cy="17.82" r="2.18" />
			<path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56m0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9" />
		</Icon>
	)
}

export function MenuIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />
		</Icon>
	)
}

export function CloseIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
		</Icon>
	)
}

export function MoreHorizIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2" />
		</Icon>
	)
}

export function TranslateIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2zm-2.62 7 1.62-4.33L19.12 17z" />
		</Icon>
	)
}

export function SearchIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" />
		</Icon>
	)
}

export function GitHubIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27" />
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
