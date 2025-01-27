import { useTheme } from 'next-themes'
import Brightness5Icon from '@mui/icons-material/Brightness5'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Navbar from 'components/Navbar'
import Link from 'next/link'

// 顶部导航栏组件
export default function Header() {
	const RenderThemeChanger = () => {
		const { theme, systemTheme, setTheme } = useTheme()
		const currentTheme = theme === 'system' ? systemTheme : theme
		if (currentTheme === 'dark') {
			return (
				<button 
					aria-label="Switch to light mode" 
					onClick={() => setTheme('light')}
					className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<Brightness4Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
				</button>
			)
		} else {
			return (
				<button 
					aria-label="Switch to dark mode" 
					onClick={() => setTheme('dark')}
					className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<Brightness5Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
				</button>
			)
		}
	}

	return (
		<header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
			<div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-14">
					{/* 移动端标题 */}
					<div className="md:hidden text-xl font-medium tracking-wide text-gray-900 dark:text-gray-100">
						<Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
							{process.env.NEXT_PUBLIC_SITE_TITLE}
						</Link>
					</div>
					<nav className="flex-1 flex justify-center">
						<Navbar RenderThemeChanger={RenderThemeChanger} />
					</nav>
				</div>
			</div>
		</header>
	)
}
