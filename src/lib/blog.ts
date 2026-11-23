import { getCollection } from 'astro:content';

export const blogPageSize = 6;

export async function getBlogPosts() {
  const posts = await getCollection('blog');
  return posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export function blogPageHref(page: number) {
  return page === 1 ? '/blog' : `/blog/pagina/${page}`;
}

export const blogDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});
