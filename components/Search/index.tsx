'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArticleOutlinedIcon, NorthEastIcon, SearchIcon } from '@/components/Icons'

import type { Locale } from '@/lib/i18n-config'
import { MAX_QUERY_LENGTH, hasSearchableText, splitHighlights } from '@/lib/search'
import type { SearchHit, SearchResponse } from '@/lib/search'
import Date from '@/components/Date'

interface SearchDialogProps {
  lang: Locale
  dict: {
    common: {
      Search: string
      SearchPlaceholder: string
      SearchPrompt: string
      SearchResults: string
      SearchNoResults: string
      SearchSearching: string
      SearchError: string
      SearchDismiss: string
      SearchSelect: string
      SearchNavigate: string
      SearchClose: string
    }
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Render Meilisearch's marked-up text as <mark> elements, never as HTML. */
function Highlighted({ text }: { text: string }) {
	return (
		<>
			{splitHighlights(text).map((run, index) =>
				run.match ? (
					<mark
						key={index}
						className="rounded-sm bg-blue-500/20 px-0.5 text-inherit group-aria-selected:bg-blue-500/30"
					>
						{run.text}
					</mark>
				) : (
					<span key={index}>{run.text}</span>
				),
			)}
		</>
	)
}

function Key({ children }: { children: ReactNode }) {
	return (
		<kbd className="inline-flex min-w-6 items-center justify-center rounded border border-site-line bg-site-surface-muted px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-site-muted">
			{children}
		</kbd>
	)
}

export default function SearchDialog({ lang, dict, open, onOpenChange }: SearchDialogProps) {
	const router = useRouter()
	const dialogRef = useRef<HTMLDialogElement>(null)
	const panelRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const optionRefs = useRef<(HTMLLIElement | null)[]>([])
	const pressedOutside = useRef(false)

	const [query, setQuery] = useState('')
	// What is searched for: the field's text, except while an IME composition
	// holds unconverted input such as raw pinyin.
	const [searchQuery, setSearchQuery] = useState('')
	const [hits, setHits] = useState<SearchHit[]>([])
	const [failed, setFailed] = useState(false)
	const [pending, setPending] = useState(false)
	// The term that `hits` and `failed` answer, so neither is shown as the
	// answer to a newer term that has not been searched yet.
	const [answered, setAnswered] = useState('')
	const [active, setActive] = useState(0)

	const term = searchQuery.trim()
	const searchable = hasSearchableText(term)
	const current = answered === term

	// Drive the native <dialog>. showModal() puts it in the top layer, so the
	// header's backdrop blur — which would otherwise become the containing block
	// for a fixed-position child — cannot trap it.
	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return

		if (open && !dialog.open) {
			dialog.showModal()
			inputRef.current?.select()
		} else if (!open && dialog.open) {
			dialog.close()
		}
	}, [open])

	// Keep the page behind the dialog from scrolling, and pad for the
	// scrollbar that hides so the page does not shift sideways.
	useEffect(() => {
		if (!open) return

		const { body, documentElement } = document
		const previousOverflow = body.style.overflow
		const previousPadding = body.style.paddingRight
		const scrollbar = window.innerWidth - documentElement.clientWidth
		body.style.overflow = 'hidden'
		if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
		return () => {
			body.style.overflow = previousOverflow
			body.style.paddingRight = previousPadding
		}
	}, [open])

	// Query on a short debounce, and abort the in-flight request when the query
	// changes so a slow early response cannot overwrite a newer one.
	useEffect(() => {
		if (!open) return

		const controller = new AbortController()
		let superseded = false

		const timer = setTimeout(async () => {
			// Nothing searchable typed: show the prompt rather than filling the
			// panel with posts the reader did not ask for.
			if (!searchable) {
				setHits([])
				setFailed(false)
				setPending(false)
				setAnswered(term)
				return
			}

			setPending(true)
			try {
				const response = await fetch(
					`/api/search?q=${encodeURIComponent(term)}&lang=${lang}`,
					{ signal: controller.signal },
				)
				if (!response.ok) throw new Error(`search responded ${response.status}`)
				const data: SearchResponse = await response.json()
				setHits(data.hits)
				setActive(0)
				setFailed(false)
				setAnswered(term)
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') return
				setHits([])
				setFailed(true)
				setAnswered(term)
			} finally {
				// Leave the indicator up when a newer query has already taken over,
				// so it does not flicker off between keystrokes.
				if (!superseded) setPending(false)
			}
		}, searchable ? 180 : 0)

		return () => {
			superseded = true
			clearTimeout(timer)
			controller.abort()
		}
	}, [open, term, searchable, lang])

	// Keep the highlighted result in view when arrowing past the fold.
	useEffect(() => {
		optionRefs.current[active]?.scrollIntoView({ block: 'nearest' })
	}, [active])

	const close = () => onOpenChange(false)

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		// Keys that confirm or move through an IME composition belong to the IME.
		// Safari ends the composition before this keydown, so there only keyCode
		// 229 shows it.
		if (event.nativeEvent.isComposing || event.keyCode === 229) return
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			setActive((index) => (hits.length ? (index + 1) % hits.length : 0))
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			setActive((index) => (hits.length ? (index - 1 + hits.length) % hits.length : 0))
		} else if (event.key === 'Enter') {
			// Results still showing for an earlier term are not what was asked for.
			const hit = current ? hits[active] : undefined
			if (hit) {
				event.preventDefault()
				close()
				router.push(hit.url)
			}
		}
	}

	// Announced once the current term has its answer, and emptied while it is
	// pending, so each new answer is read out even when its text is unchanged.
	let status = ''
	if (searchable && current && !pending) {
		status = failed
			? dict.common.SearchError
			: hits.length
				? dict.common.SearchResults
				: dict.common.SearchNoResults
	}
	const stale = pending || !current

	return (
		<dialog
			ref={dialogRef}
			onClose={close}
			onPointerDown={(event) => {
				pressedOutside.current = !panelRef.current?.contains(event.target as Node)
			}}
			onClick={(event) => {
				// A drag that starts in the field to select text and is released past
				// the panel's edge also ends in a click out here, so the press must
				// have started outside the panel too.
				if (pressedOutside.current && !panelRef.current?.contains(event.target as Node)) close()
				pressedOutside.current = false
			}}
			aria-label={dict.common.Search}
			className="fixed inset-0 m-0 h-full max-h-full w-full max-w-full bg-transparent p-0 text-site-copy backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
		>
			<div className="flex min-h-full justify-center px-3 pt-[8vh] pb-6 sm:px-4 sm:pt-[10vh]">
				<div
					ref={panelRef}
					className="flex h-fit max-h-[72vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-site-line bg-site-surface shadow-2xl"
				>
					{/* The field is the top of the panel itself, separated from the
					    results by a rule rather than boxed inside one. */}
					<div className="shrink-0 border-b border-site-line">
						<div className="flex items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
							{pending ? (
								<span
									aria-hidden
									className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-site-line border-t-blue-600 dark:border-t-blue-400"
								/>
							) : (
								<SearchIcon className="shrink-0 text-site-muted" />
							)}
							<input
								ref={inputRef}
								value={query}
								onChange={(event) => {
									setQuery(event.target.value)
									// Mid-composition text is not a term yet; compositionend
									// brings the converted one.
									if (!(event.nativeEvent as InputEvent).isComposing) {
										setSearchQuery(event.target.value)
									}
								}}
								onCompositionEnd={(event) => setSearchQuery(event.currentTarget.value)}
								onKeyDown={onKeyDown}
								maxLength={MAX_QUERY_LENGTH}
								placeholder={dict.common.SearchPlaceholder}
								aria-label={dict.common.SearchPlaceholder}
								role="combobox"
								aria-expanded={hits.length > 0}
								aria-controls={hits.length > 0 ? 'search-results' : undefined}
								aria-autocomplete="list"
								aria-activedescendant={hits[active] ? `search-hit-${active}` : undefined}
								autoComplete="off"
								spellCheck={false}
								className="w-full bg-transparent text-base text-site-heading outline-none placeholder:text-site-muted"
							/>
							{/* Kept on every viewport: the keyboard legend below is
							    desktop-only, so on a phone this is the visible way out
							    besides tapping the backdrop. */}
							<button
								type="button"
								onClick={close}
								className="shrink-0 rounded border border-site-line px-1.5 py-0.5 font-mono text-xs leading-none text-site-muted transition-colors hover:border-site-muted hover:text-site-heading"
							>
								{/* The visible "esc" leads the accessible name, so a
								    speech-input user can say what they see. */}
								esc
								<span className="sr-only"> {dict.common.SearchDismiss}</span>
							</button>
						</div>
					</div>

					<p role="status" className="sr-only">
						{status}
					</p>

					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4 sm:pb-4">
						{failed || hits.length === 0 ? (
							// One centred block for every empty state, so the panel never
							// shows a lone line of text floating against its left edge.
							<div className="flex flex-col items-center justify-center gap-2.5 px-6 py-9 text-center">
								<SearchIcon size={28} className="text-site-muted/40" />
								<p className="mb-0 max-w-xs text-sm leading-relaxed text-site-muted">
									{!searchable
										? dict.common.SearchPrompt
										: !current
											? dict.common.SearchSearching
											: failed
												? dict.common.SearchError
												: dict.common.SearchNoResults}
								</p>
							</div>
						) : (
							<>
								<p className="px-1 pb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
									{dict.common.SearchResults}
								</p>
								<ul
									id="search-results"
									role="listbox"
									aria-label={dict.common.Search}
									aria-busy={stale}
									className={`list-none space-y-1.5 transition-opacity ${stale ? 'opacity-60' : ''}`}
								>
									{hits.map((hit, index) => (
										<li
											key={hit.id}
											id={`search-hit-${index}`}
											role="option"
											aria-selected={index === active}
											ref={(node) => {
												optionRefs.current[index] = node
											}}
											onMouseMove={() => setActive(index)}
											className="group"
											data-active={index === active ? '' : undefined}
										>
											<Link
												href={hit.url}
												onClick={close}
												tabIndex={-1}
												className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors sm:gap-3.5 sm:px-3.5 sm:py-3 ${
													index === active
														? 'border-blue-500/60 bg-blue-500/10'
														: 'border-transparent bg-site-surface-muted/60'
												}`}
											>
												<ArticleOutlinedIcon
													className={`mt-0.5 shrink-0 ${
														index === active
															? 'text-blue-600 dark:text-blue-400'
															: 'text-site-muted'
													}`}
												/>
												<span className="min-w-0 flex-1">
													<span className="flex items-baseline justify-between gap-3">
														<span className="truncate text-[0.9375rem] font-semibold text-site-heading">
															<Highlighted text={hit.title} />
														</span>
														<span className="hidden shrink-0 font-mono text-xs text-site-muted sm:block">
															<Date dateString={hit.date} locale={lang} format="YYYY-MM-DD" />
														</span>
													</span>
													{hit.heading && (
														<span className="mt-0.5 block truncate text-sm text-blue-600 dark:text-blue-400">
															<Highlighted text={hit.heading} />
														</span>
													)}
													<span className="mt-1 line-clamp-2 text-sm leading-relaxed text-site-muted">
														<Highlighted text={hit.snippet} />
													</span>
												</span>
												<span
													aria-hidden
													className={`mt-0.5 hidden shrink-0 sm:block ${
														index === active ? 'opacity-100' : 'opacity-0'
													}`}
												>
													<NorthEastIcon size={16} className="inline-block text-site-muted" />
												</span>
											</Link>
										</li>
									))}
								</ul>
							</>
						)}
					</div>

					{/* Keyboard legend, as on Astro's docs search. Pointer-only screens
					    have no use for it, so it is desktop-width only. */}
					<div className="hidden shrink-0 items-center gap-4 border-t border-site-line px-4 py-2 text-xs text-site-muted sm:flex">
						<span className="flex items-center gap-1.5">
							<Key>↵</Key>
							{dict.common.SearchSelect}
						</span>
						<span className="flex items-center gap-1.5">
							<Key>↑</Key>
							<Key>↓</Key>
							{dict.common.SearchNavigate}
						</span>
						<span className="flex items-center gap-1.5">
							<Key>esc</Key>
							{dict.common.SearchClose}
						</span>
						<span className="ml-auto text-site-muted/70">Meilisearch</span>
					</div>
				</div>
			</div>
		</dialog>
	)
}
