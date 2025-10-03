import { getCollection } from 'astro:content';

export async function GET() {
  const all = await getCollection('blog');
  const posts = all.filter((p) => (import.meta.env.PROD ? p.data.status === 'published' : true));
  const blogItems = posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((p) => ({
      type: 'post' as const,
      id: p.id,
      url: `/blog/${p.id}/`,
      title: p.data.title,
      description: p.data.description ?? '',
      // include body text for fuzzy search when available (Markdown entries)
      content: (p as any).body ? String((p as any).body) : '',
      tags: Array.isArray(p.data.tags) ? p.data.tags : [],
      pubDate: p.data.pubDate,
    }));

  // Include key pages in search index
  const pageItems = [
    { url: '/', title: 'Domov', description: 'Kritické myslenie – úvod a najnovšie články', tags: ['domov', 'home'], content: '' },
    { url: '/about', title: 'O projekte', description: 'Prečo vznikol, čo ponúka a ako môže pomôcť', tags: ['o projekte', 'projekt', 'autor', 'lukas', 'lukáš', 'cech', 'čech', 'lukáš čech'], content: 'O autorovi: Lukáš Čech' },
    { url: '/kontakt', title: 'Kontakt', description: 'Napíš mi spätnú väzbu alebo otázku', tags: ['kontakt', 'email'], content: '' },
    { url: '/blog/', title: 'Všetky články', description: 'Prehľad všetkých článkov', tags: ['blog', 'články'], content: '' },
    { url: '/categories/', title: 'Kategórie', description: 'Články podľa kategórií', tags: ['kategórie', 'témy'], content: '' },
    { url: '/tags/', title: 'Témy', description: 'Zoznam tém a značiek', tags: ['tagy', 'témy'], content: '' },
  ].map((p) => ({ type: 'page' as const, pubDate: null, ...p }));

  const items = [...pageItems, ...blogItems];
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
