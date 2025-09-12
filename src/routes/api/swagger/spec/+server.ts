import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { swaggerSpec } from '$lib/swagger/spec';

export const GET: RequestHandler = async () => {
    return json(swaggerSpec, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    });
};