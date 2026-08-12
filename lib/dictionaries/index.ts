import { Locale } from '@/lib/i18n-config'

const dictionaries = {
	en: () => import('./en.json').then((module) => module.default),
	zh: () => import('./zh.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => dictionaries[locale]()

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>

// The strings the layout chrome (header, navbar, search) shares. Kept as one
// type so adding a string does not mean editing the same inline prop type in
// four components.
export type CommonDictionary = Dictionary['common']
