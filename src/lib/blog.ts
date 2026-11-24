import { getCollection } from 'astro:content';
import { sitePages } from '../data/navigation';

export const blogPageSize = 6;

export async function getBlogPosts() {
  const posts = await getCollection('blog');
  return posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export function blogPageHref(page: number) {
  const { href } = sitePages.blog;
  return page === 1 ? href : `${href}/pagina/${page}`;
}

export const blogDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});
