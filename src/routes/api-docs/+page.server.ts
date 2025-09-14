import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Redirect to the simple documentation page for now
    // since the full Swagger UI might have loading issues
    throw redirect(302, '/api-docs/simple');
};