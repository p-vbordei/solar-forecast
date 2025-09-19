import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // Get forecasts for a specific time range
  const forecasts = await db.forecast.findMany({
    where: {
      locationId: "363019d2-5c56-402c-8c32-202786d252ca",
      timestamp: {
        gte: new Date('2025-09-19T10:00:00Z'),
        lte: new Date('2025-09-19T11:00:00Z')
      }
    },
    orderBy: {
      timestamp: 'asc'
    },
    select: {
      timestamp: true,
      powerMW: true
    }
  })

  console.log(`Total forecasts in 1 hour: ${forecasts.length}`)

  // Check for duplicates
  const timestampCounts = {}
  forecasts.forEach(f => {
    const ts = f.timestamp.toISOString()
    timestampCounts[ts] = (timestampCounts[ts] || 0) + 1
  })

  const duplicates = Object.entries(timestampCounts)
    .filter(([_, count]) => count > 1)
    .map(([ts, count]) => ({ timestamp: ts, count }))

  if (duplicates.length > 0) {
    console.log(`\nDUPLICATES FOUND: ${duplicates.length} timestamps have multiple records`)
    console.log('Sample duplicates:')
    duplicates.slice(0, 5).forEach(d => {
      console.log(`  ${d.timestamp}: ${d.count} records`)
    })
  }

  // Check for gaps (should have 4 records per hour for 15-min intervals)
  const uniqueTimestamps = [...new Set(forecasts.map(f => f.timestamp.toISOString()))]
  console.log(`\nUnique timestamps: ${uniqueTimestamps.length}`)
  console.log('Expected for 15-min intervals: 4')

  if (uniqueTimestamps.length < 4) {
    console.log('WARNING: Missing time intervals!')
  }

  await db.$disconnect()
}

main().catch(console.error)