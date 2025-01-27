import Head from 'next/head'
import Link from 'next/link'
import Layout from 'components/Layout'
import { getSortedPostsData } from 'lib/posts'

export async function getStaticProps() {
	const allPostsData = getSortedPostsData()
	return {
		props: {
			allPostsData,
		},
	}
}

export default function Archive({ allPostsData }) {
	// 按年份分组文章
	const postsByYear = allPostsData.reduce((acc, post) => {
		const year = post.date.split('-')[0]
		if (!acc[year]) {
			acc[year] = []
		}
		acc[year].push(post)
		return acc
	}, {})

	// 获取所有年份并排序
	const years = Object.keys(postsByYear).sort((a, b) => b - a)

	return (
		<Layout>
			<Head>
				<title>Archive</title>
			</Head>
			<section className="max-w-2xl mx-auto px-4">
				{/* 主要内容区 */}
				<div>
					{years.map(year => (
						<section key={year} id={year} className="mb-12">
							<h2 className="text-2xl font-bold mb-4 pb-2 border-b-2 border-gray-200 dark:border-gray-700 dark:text-gray-100">
								{year}
							</h2>
							<ul className="space-y-4 list-none">
								{postsByYear[year].map(({ date, slug, title }) => (
									<li key={slug} className="group">
										<div className="flex items-baseline gap-4 hover:bg-gray-100/70 dark:hover:bg-gray-800 p-3 rounded-lg transition-all duration-200 cursor-pointer">
											<time className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
												{date.split('-').slice(1).join('-')}
											</time>
											<Link href={`/${date.split('-')[0]}/${date.split('-')[1]}/${slug}`}>
												<span className="text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
													{title}
												</span>
											</Link>
										</div>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				{/* 右侧年份导航 */}
				<nav className="hidden lg:block fixed top-24 right-8 xl:right-16 2xl:right-24">
					<div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
						{years.map(year => (
							<a
								key={year}
								href={`#${year}`}
								className="group flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-all duration-200"
							>
								<span className="text-base text-gray-800 dark:text-gray-200 font-medium">
									{year}
								</span>
								<span className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium rounded-full h-5 min-w-[20px] px-1.5">
									{postsByYear[year].length}
								</span>
							</a>
						))}
					</div>
				</nav>
			</section>
		</Layout>
	)
}