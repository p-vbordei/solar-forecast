import { z } from 'zod';

export const GenerateTemplateRequestSchema = z.object({
	location_name: z.string().optional().default('Solar Farm Site A'),
	location_guid: z.string().optional().default('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
	time_aggregation: z.enum(['15min', 'hourly', 'daily']).optional().default('hourly'),
	start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
	end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
	timezone: z.string().regex(/^[+-]\d{2}:\d{2}$/, 'Timezone must be in ±HH:MM format').optional().default('+03:00'),
	format: z.enum(['csv', 'json']).optional().default('csv')
}).refine(
	(data) => new Date(data.start_date) <= new Date(data.end_date),
	{
		message: 'start_date must be before or equal to end_date',
		path: ['end_date']
	}
);

export type GenerateTemplateRequest = z.infer<typeof GenerateTemplateRequestSchema>;