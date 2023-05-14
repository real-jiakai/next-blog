import { useState } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Rating from '@mui/material/Rating'
import useTranslation from 'next-translate/useTranslation'
import Layout from 'components/Layout'
import getDoubanMovies from 'lib/getDoubanMovies'

export default function Douban() {
	const { t } = useTranslation('douban')
	const movies = getDoubanMovies()
	const years = [...new Set(movies.map(movie => movie.year))].sort().reverse()
    
	const getLatestYearWithMovies = () => {
		for (let year of years) {
			if (movies.some(movie => movie.year === year)) {
				return year
			}
		}
		return null
	}
    
	const [selectedYear, setSelectedYear] = useState(getLatestYearWithMovies())
    
	const handleYearClick = (year) => {
		setSelectedYear(year)
	}

	return (
		<Layout>
			<Head>
				<title>{t('Douban')}</title>
			</Head>
			<div className="container mx-auto px-4">
				<div className="flex flex-col items-start">
					<div className="flex items-center mb-4">
						<span className="font-bold mr-2">{t('Year')}: </span>
						<div className="flex flex-wrap">
							{years.map((year, index) => (
								<button 
									key={index} 
									onClick={() => handleYearClick(year)}
									className="m-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-700 active:bg-blue-800 focus:outline-none"
								>
									{year}
								</button>
							))}
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
						{movies.filter(movie => movie.year === selectedYear).reverse().map((movie, index) => (
							<div key={index} className="text-center">
								<a href={movie.url} target="_blank" rel="noopener noreferrer" className='text-blue-600 hover:text-blue-800 visited:text-purple-600'>
									<Image src={movie.img} alt={movie.title} className="mx-auto" width={200} height={300}/>
									<p>{movie.title}</p>
								</a>
								<p><Rating name="read-only" value={Number(movie.stars)} readOnly /></p>
							</div>
						))}
					</div>
				</div>
			</div>
		</Layout>
	)
}
