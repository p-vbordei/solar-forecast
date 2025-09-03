import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  // Mock data for plants
  const plants = [
    {
      id: '1',
      name: 'Solar Plant Alpha',
      capacity: 10,
      location: 'Bucharest',
      status: 'active'
    },
    {
      id: '2',
      name: 'Solar Plant Beta',
      capacity: 15,
      location: 'Cluj',
      status: 'active'
    },
    {
      id: '3',
      name: 'Solar Plant Gamma',
      capacity: 8,
      location: 'Timisoara',
      status: 'active'
    },
    {
      id: '4',
      name: 'Solar Plant Delta',
      capacity: 12,
      location: 'Constanta',
      status: 'maintenance'
    },
    {
      id: '5',
      name: 'Solar Plant Epsilon',
      capacity: 20,
      location: 'Iasi',
      status: 'active'
    }
  ];

  return json({
    success: true,
    data: plants
  });
};