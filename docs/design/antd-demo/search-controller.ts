export type SearchResult = { url: string; meta: { title: string }; excerpt: string };
export type SearchAPI = { init(): Promise<void>; destroy?(): Promise<void>; search(query: string): Promise<{results: {data(): Promise<SearchResult>}[]}> };

export function pagefindModuleUrl(base: string, retry: number, origin: string): string {
  if (retry === 0) return base;
  const url = new URL(base, origin);
  url.searchParams.set('retry', String(retry));
  return url.href;
}

// Pagefind cannot abort a running query; invalidate its result as soon as input changes.
export class SearchController {
  private generation = 0;
  private api: Promise<SearchAPI> | undefined;
  private failures = 0;
  constructor(private load: (retry: number) => Promise<SearchAPI>, private language: string, private origin: string) {}
  cancel() { this.generation += 1; }
  async search(query: string): Promise<SearchResult[] | undefined> {
    const generation = ++this.generation;
    if (!this.api) {
      this.api = this.load(this.failures).then(async api => {await api.init(); return api;});
    }
    let api: SearchAPI | undefined;
    try {
      api = await this.api;
      const response = await api.search(query);
      const candidates = await Promise.all(response.results.slice(0, 16).map(result => result.data()));
      if (generation !== this.generation) return undefined;
      return candidates.filter(result => {
        const pathname = new URL(result.url, this.origin).pathname;
        return this.language === 'en' ? pathname.startsWith('/en/') : !pathname.startsWith('/en/');
      }).slice(0, 8);
    } catch (error) {
      if (generation !== this.generation) return undefined;
      this.api = undefined;
      this.failures += 1;
      // Failed imports and Pagefind's failed index/worker state require a fresh module instance.
      if (api?.destroy) {
        try {await api.destroy();} catch (cleanupError) {console.warn('Could not release failed search instance',cleanupError);}
      }
      if (generation !== this.generation) return undefined;
      throw error;
    }
  }
}
