import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  console.log('Starting cleanup of duplicate forecasts...')

  // Find all unique combinations of timestamp and locationId that have duplicates
  const duplicates = await db.$queryRaw`
    SELECT timestamp, "locationId", COUNT(*) as count
    FROM forecasts
    GROUP BY timestamp, "locationId"
    HAVING COUNT(*) > 1
  `

  console.log(`Found ${duplicates.length} timestamp/location combinations with duplicates`)

  // For each duplicate, keep only the most recent one (highest id)
  for (const dup of duplicates) {
    // Get all records for this timestamp/location
    const records = await db.forecast.findMany({
      where: {
        timestamp: dup.timestamp,
        locationId: dup.locationId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (records.length > 1) {
      // Keep the first (most recent), delete the rest
      const toDelete = records.slice(1).map(r => r.id)

      await db.forecast.deleteMany({
        where: {
          id: {
            in: toDelete
          }
        }
      })

      console.log(`Deleted ${toDelete.length} duplicates for ${dup.timestamp.toISOString()} / ${dup.locationId}`)
    }
  }

  console.log('Cleanup complete!')

  // Verify no duplicates remain
  const remaining = await db.$queryRaw`
    SELECT timestamp, "locationId", COUNT(*) as count
    FROM forecasts
    GROUP BY timestamp, "locationId"
    HAVING COUNT(*) > 1
  `

  if (remaining.length === 0) {
    console.log('✅ No duplicates remaining - database is clean')
  } else {
    console.log(`⚠️ Still have ${remaining.length} duplicates`)
  }

  await db.$disconnect()
}

main().catch(console.error)