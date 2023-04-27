import Head from 'next/head'
import useTranslation from 'next-translate/useTranslation'
import Layout from 'components/Layout'

// 关于页面
export default function About() {
	const { t } = useTranslation('about')
	const about = t('About')
	return (
		<Layout>
			<Head>
				<title>{about}</title>
			</Head>
			<h1 className='text-center my-3'>{about}</h1>
			<div className='container mx-auto px-4 w-3/5'>
				<p className='my-4'>
				本站点专注于分享互联网上有趣的内容。
				</p>
				<p className='my-4'>
				周刊名字取为《周见》。这意味着我希望每周自己都能在学习与生活中发现美，将看到的新奇事物分享出来。
				</p>
				<p className='my-4'>
				欢迎通过<a href="https://gujiakai.top/rss.xml" target='blank'>RSS</a>订阅本站点。
				</p>
				<p className='my-4'>
				想了解更多关于我的信息，请点击上方的<strong>Blog</strong>。
				</p>
			</div>
		</Layout>
	)
}