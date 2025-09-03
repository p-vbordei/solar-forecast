import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock alerts data
const mockAlerts = [
    {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'critical',
        location: 'Solar Farm Alpha',
        locationId: 1,
        message: 'Inverter failure detected - Unit 3',
        status: 'active',
        value: 0,
        threshold: 100,
        category: 'equipment'
    },
    {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'warning',
        location: 'Solar Station Beta',
        locationId: 2,
        message: 'Production below expected - 72% of forecast',
        status: 'active',
        value: 72,
        threshold: 80,
        category: 'performance'
    },
    {
        id: '3',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: 'info',
        location: 'Green Energy Park',
        locationId: 3,
        message: 'Scheduled maintenance reminder',
        status: 'acknowledged',
        category: 'maintenance'
    },
    {
        id: '4',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        type: 'warning',
        location: 'Coastal Solar Array',
        locationId: 4,
        message: 'High temperature detected on panels',
        status: 'resolved',
        value: 85,
        threshold: 80,
        category: 'environmental'
    }
];

export const GET: RequestHandler = async ({ url }) => {
    try {
        const type = url.searchParams.get('type');
        const status = url.searchParams.get('status');
        const locationId = url.searchParams.get('locationId');
        
        let filteredAlerts = [...mockAlerts];
        
        if (type) {
            filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
        }
        
        if (status) {
            filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
        }
        
        if (locationId) {
            filteredAlerts = filteredAlerts.filter(alert => alert.locationId === parseInt(locationId));
        }
        
        return json({
            success: true,
            data: filteredAlerts,
            total: filteredAlerts.length,
            stats: {
                critical: mockAlerts.filter(a => a.type === 'critical' && a.status === 'active').length,
                warning: mockAlerts.filter(a => a.type === 'warning' && a.status === 'active').length,
                info: mockAlerts.filter(a => a.type === 'info' && a.status === 'active').length
            }
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return json({
            success: false,
            error: 'Failed to fetch alerts'
        }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const alert = await request.json();
        
        const newAlert = {
            id: (mockAlerts.length + 1).toString(),
            timestamp: new Date().toISOString(),
            status: 'active',
            ...alert
        };
        
        mockAlerts.unshift(newAlert);
        
        return json({
            success: true,
            data: newAlert
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating alert:', error);
        return json({
            success: false,
            error: 'Failed to create alert'
        }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request }) => {
    try {
        const { id, status } = await request.json();
        
        const alertIndex = mockAlerts.findIndex(alert => alert.id === id);
        
        if (alertIndex === -1) {
            return json({
                success: false,
                error: 'Alert not found'
            }, { status: 404 });
        }
        
        mockAlerts[alertIndex].status = status;
        
        return json({
            success: true,
            data: mockAlerts[alertIndex]
        });
    } catch (error) {
        console.error('Error updating alert:', error);
        return json({
            success: false,
            error: 'Failed to update alert'
        }, { status: 500 });
    }
};