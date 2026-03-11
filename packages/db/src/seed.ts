import { db } from ".";

async function main() {
  const regions = [
    { name: "asia" },
    { name: "north-america" },
    { name: "south-america" },
    { name: "australia" },
    { name: "africa" },
    { name: "europe" },
  ];
  const response = await db.region.findMany();
  if (!response || !response.length) {
    try {
      const createRegions = await db.region.createMany({ data: regions });
      console.log("Created regions: \n", createRegions);
    } catch (error) {
      console.error("Unable to create regions: \n", error);
    }
  } else {
    console.log("Regions already exists: \n", response);
  }
}

main();
