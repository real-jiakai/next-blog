import { describe, expect, it } from 'vitest'
import en from '@/lib/dictionaries/en.json'
import zh from '@/lib/dictionaries/zh.json'

type Section = Record<string, string>

const sections = (dict: Record<string, Section>) =>
	Object.fromEntries(Object.entries(dict).map(([name, section]) => [name, Object.keys(section).sort()]))

describe('dictionaries', () => {
	it('define the same keys in both locales', () => {
		expect(sections(en)).toEqual(sections(zh))
	})

	it('use full-width punctuation in Chinese strings', () => {
		const halfWidth = Object.entries(zh as Record<string, Section>).flatMap(([name, section]) =>
			Object.entries(section)
				.filter(([, value]) => /\p{Script=Han}/u.test(value))
				.filter(([, value]) => /[(),!?;]|:(?!\/\/)|\.\.\./.test(value))
				.map(([key, value]) => `${name}.${key}: ${value}`),
		)
		expect(halfWidth).toEqual([])
	})
})
