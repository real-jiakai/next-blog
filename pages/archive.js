import Head from 'next/head';
import Link from 'next/link';
import Layout from 'components/Layout';
import { getSortedPostsData } from 'lib/posts';

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
}

export default function Archive({ allPostsData }) {
  return (
    <Layout>
      <Head>
        <title>Archive</title>
      </Head>
      <section className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold my-6 flex items-center dark:text-gray-100">
          <span className="text-red-500 mr-2">📌</span>
          Archive
        </h1>
        <ul className="space-y-4">
          {allPostsData.map(({ date, slug, title }) => (
            <li key={slug} className="border border-gray-200 rounded-lg p-3 flex items-center">
              <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded mr-3 whitespace-nowrap">
                {date}
              </span>
              <Link href={`/${date.split('-')[0]}/${date.split('-')[1]}/${slug}`}>
                <span className="hover:underline cursor-pointer dark:text-gray-100">{title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}