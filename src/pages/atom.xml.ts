import type { APIRoute } from 'astro';
import { posts } from '../lib/content';
import { atomFeed } from '../lib/feed';
export const GET: APIRoute = async () => atomFeed(await posts());
