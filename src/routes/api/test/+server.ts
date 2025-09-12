import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        console.log('Test endpoint received:', body);
        
        return json({
            success: true,
            message: 'Test endpoint working',
            receivedData: body,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        
        return json({
            success: false,
            error: 'Test endpoint failed',
            details: error.message
        }, { status: 500 });
    }
};