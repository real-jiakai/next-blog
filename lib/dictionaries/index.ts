import { Locale } from '@/lib/i18n-config'

const dictionaries = {
	en: () => import('./en.json').then((module) => module.default),
	zh: () => import('./zh.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
