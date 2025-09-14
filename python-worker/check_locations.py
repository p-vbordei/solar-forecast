import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text('SELECT id, name FROM locations LIMIT 5'))
        rows = r.fetchall()
        print('Locations in DB:')
        if rows:
            for row in rows:
                print(f'  {row.id}: {row.name}')
        else:
            print('  No locations found')
            # Check weather_data entries
            r2 = await db.execute(text('SELECT DISTINCT "locationId" FROM weather_data LIMIT 5'))
            rows2 = r2.fetchall()
            if rows2:
                print('\nLocation IDs in weather_data:')
                for row in rows2:
                    print(f'  {row.locationId}')

asyncio.run(check())