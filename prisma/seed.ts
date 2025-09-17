import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Create default client if it doesn't exist
  let defaultClient = await prisma.client.findFirst({
    where: {
      name: "Default Solar Operations",
    },
  });

  if (!defaultClient) {
    console.log("Creating default client...");
    defaultClient = await prisma.client.create({
      data: {
        name: "Default Solar Operations",
        code: "DEFAULT",
        contactEmail: "admin@solarops.com",
        contactPhone: "+40 123 456 789",
        address: "Solar Street 1, Bucharest, Romania",
        country: "Romania",
        timezone: "Europe/Bucharest",
        currency: "EUR",
        isActive: true,
        contractStart: new Date("2024-01-01"),
        contractEnd: new Date("2029-12-31"),
        metadata: {
          notes: "Default client for system operations",
        },
      },
    });
    console.log("Default client created:", defaultClient.name);
  } else {
    console.log("Default client already exists:", defaultClient.name);
  }

  // Create sample locations if needed
  const locationCount = await prisma.location.count();
  if (locationCount === 0) {
    console.log("Creating sample locations...");

    const locations = [
      {
        clientId: defaultClient.id,
        name: "Solar Farm Alpha",
        code: "ALPHA_001",
        latitude: 44.4268,
        longitude: 26.1025,
        city: "Bucharest",
        region: "Ilfov",
        country: "Romania",
        timezone: "Europe/Bucharest",
        capacityMW: 10.5,
        status: "ACTIVE",
        trackingSystem: "FIXED",
        installationDate: new Date("2023-06-15"),
      },
      {
        clientId: defaultClient.id,
        name: "Solar Station Beta",
        code: "BETA_002",
        latitude: 46.7712,
        longitude: 23.6236,
        city: "Cluj-Napoca",
        region: "Cluj",
        country: "Romania",
        timezone: "Europe/Bucharest",
        capacityMW: 8.2,
        status: "ACTIVE",
        trackingSystem: "SINGLE_AXIS",
        installationDate: new Date("2023-08-20"),
      },
      {
        clientId: defaultClient.id,
        name: "Green Energy Park",
        code: "GREEN_003",
        latitude: 45.7489,
        longitude: 21.2087,
        city: "Timisoara",
        region: "Timis",
        country: "Romania",
        timezone: "Europe/Bucharest",
        capacityMW: 15.0,
        status: "ACTIVE",
        trackingSystem: "DUAL_AXIS",
        installationDate: new Date("2024-01-10"),
      },
    ];

    for (const location of locations) {
      const created = await prisma.location.create({
        data: location,
      });
      console.log(`Created location: ${created.name}`);
    }
  } else {
    console.log(`Found ${locationCount} existing locations`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
