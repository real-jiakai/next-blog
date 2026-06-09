import type { Metadata } from 'next'
import { Locale } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getPostsListByTag, getAllTagsAllLocales } from '@/lib/posts'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'

interface TagParams {
  lang: Locale
  tag: string
}

export async function generateStaticParams() {
	const allTags = getAllTagsAllLocales()

	return allTags.map(({ tag, locale }) => ({
		lang: locale,
		tag,
	}))
}

export async function generateMetadata({
	params,
}: {
  params: Promise<TagParams>
}): Promise<Metadata> {
	const { tag } = await params
	return {
		title: `Tag: ${tag}`,
	}
}

export default async function TagPage({
	params,
}: {
  params: Promise<TagParams>
}) {
	const { lang, tag } = await params
	const dict = await getDictionary(lang)
	const posts = getPostsListByTag(tag, lang)

	return (
		<Layout lang={lang} dict={dict}>
			<section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-center gap-2 mb-8">
					<LocalOfferIcon className="text-gray-600 dark:text-gray-300" />
					<h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
						{dict.common.PostsWithTag}: {tag}
					</h1>
				</div>
				<div className="min-h-[calc(100vh-16rem)] flex flex-col justify-between">
					<div className="space-y-4 flex-grow">
						{posts.length > 0 ? (
							posts.map((post) => (
								<PostCard key={post.slug} lang={lang} post={post} />
							))
						) : (
							<p className="text-gray-600 dark:text-gray-300 text-center">
								{dict.common.NoPostsWithTag || 'No posts found with this tag.'}
							</p>
						)}
					</div>
				</div>
			</section>
		</Layout>
	)
}
