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
				欢迎通过<a href="https://gujiakai.top/index.xml" target='blank' className='underline text-blue-600 hover:text-blue-800 visited:text-purple-600'>RSS</a>订阅本站点。
				</p>
				<p className='my-4'>
				想了解更多关于我的信息，欢迎访问我的<a href="https://blog.gujiakai.top" target='blank' className='underline text-blue-600 hover:text-blue-800 visited:text-purple-600'>Blog</a>。
				</p>
			</div>
		</Layout>
	)
}