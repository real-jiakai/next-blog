import Layout from 'components/Layout'
import { useState } from 'react'
import Head from 'next/head'
import getPhotoList from 'lib/getPhotoList'
import getThumbnailList from 'lib/getThumbnailList'
import PhotoAlbum from 'react-photo-album'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import useTranslation from 'next-translate/useTranslation'

export default function GalleryPage({ images, thumbnails }) {
	const [index, setIndex] = useState(-1)
	const { t } = useTranslation('gallery')
	const gallery = t('Gallery')
	return (
		<Layout>
			<Head>
				<title>{gallery}</title>
			</Head>
			<PhotoAlbum
				layout="rows"
				photos={thumbnails}
				targetRowHeight={150}
				onClick={({ index }) => setIndex(index)}
			/>
			 <Lightbox
				open={index >= 0}
				index={index}
				close={() => setIndex(-1)}
				slides={images}
				plugins={[Zoom]}
			/>
		</Layout>
	)
}

export async function getServerSideProps() {
	const images = getPhotoList()
	const thumbnails = getThumbnailList()
	return {
		props: {
			images,
			thumbnails,
		},
	}
}