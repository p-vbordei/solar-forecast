import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Basic health check - can be expanded with database connectivity check
	try {
		return new Response(
			JSON.stringify({
				status: 'healthy',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				environment: process.env.NODE_ENV || 'development'
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
};