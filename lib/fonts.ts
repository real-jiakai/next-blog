import { Noto_Sans_SC, Source_Serif_4 } from 'next/font/google'

// One family for both scripts. Noto Sans SC draws its Latin from Source Sans
// and its Chinese from Source Han Sans, which were designed as a pair, so
// mixed zh/en sentences keep a single voice instead of visibly switching face
// mid-line — the usual failing of a Latin webfont plus a system CJK fallback.
//
// `next/font` fetches it at build time and serves it from this origin, so the
// CSP stays at `font-src 'self'` and no reader request leaves the site. Google
// splits the family into ~100 unicode ranges and that split is preserved, so a
// browser downloads only the slices holding characters the page actually uses.
//
// It is a variable font, so one face per range covers every weight. Listing
// static weights would repeat each range's @font-face once per weight, all
// pointing at the same file, in the stylesheet every page blocks on.
//
// Shared by the [lang] layout and the global 404, which renders its own <html>
// and would otherwise fall back to the bare system font stack.
export const sans = Noto_Sans_SC({
	subsets: ['latin'],
	weight: 'variable',
	display: 'swap',
	variable: '--font-sans-cjk',
})

// For digits only (issue numerals, years, the 404), through the `font-display`
// utility. Source Serif was drawn by Adobe as the companion to Source Sans,
// where Noto Sans SC's own figures come from, so serif numerals beside the
// text look designed together rather than pasted on. One static weight of the
// Latin subset is all that use needs; next/font's size-adjusted fallback keeps
// the swap from shifting the layout.
export const display = Source_Serif_4({
	subsets: ['latin'],
	weight: '600',
	display: 'swap',
	variable: '--font-display-serif',
})
