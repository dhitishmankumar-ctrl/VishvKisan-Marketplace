import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateMarketplaceListingBody,
  CreateMarketplaceListingResponse,
  DeleteMarketplaceListingParams,
  GetMarketPriceGuidanceQueryParams,
  GetMarketPriceGuidanceResponse,
  ListMarketplaceListingsResponse,
  ListStoragePointsResponse,
  SubmitDemoOrderBody,
  SubmitDemoOrderResponse,
  UpdateMarketplaceListingParams,
  UpdateMarketplaceListingBody,
  UpdateMarketplaceListingResponse,
} from "@workspace/api-zod";
import {
  db,
  demoOrdersTable,
  marketplaceListingsTable,
  storagePointsTable,
} from "@workspace/db";

const router: IRouter = Router();

const defaultStoragePoints = [
  {
    id: "sualkuchi-collection",
    name: "Sualkuchi Produce Collection Centre",
    type: "Collection Centre",
    district: "Kamrup",
    state: "Assam",
    address: "Sualkuchi, Kamrup, Assam",
  },
  {
    id: "guwahati-cold-store",
    name: "Guwahati Fresh Produce Cold Store",
    type: "Cold Storage",
    district: "Kamrup Metropolitan",
    state: "Assam",
    address: "Lokhra Road, Guwahati, Assam",
  },
  {
    id: "nalbari-grain-warehouse",
    name: "Nalbari Regional Grain Warehouse",
    type: "Warehouse",
    district: "Nalbari",
    state: "Assam",
    address: "Nalbari Town, Assam",
  },
  {
    id: "barpeta-farm-hub",
    name: "Barpeta Farm Logistics Hub",
    type: "Collection Centre",
    district: "Barpeta",
    state: "Assam",
    address: "Barpeta Road, Assam",
  },
  {
    id: "hajo-village-aggregation",
    name: "Hajo Village Aggregation Point",
    type: "Warehouse",
    district: "Kamrup",
    state: "Assam",
    address: "Hajo, Kamrup, Assam",
  },
];

const simulatedRetailCaps: Record<string, number> = {
  tomatoes: 44,
  tomato: 44,
  potatoes: 34,
  potato: 34,
  "leafy lettuce": 58,
  lettuce: 58,
  carrots: 48,
  carrot: 48,
  "red apples": 160,
  apples: 160,
  bananas: 65,
  "rice / paddy": 58,
  rice: 58,
  paddy: 58,
  "fresh ginger": 95,
  ginger: 95,
  "farm milk": 52,
  milk: 52,
};

const unitRetailCaps: Record<string, number> = {
  kg: 100,
  quintal: 9000,
  bunch: 60,
  litre: 100,
  dozen: 120,
  piece: 30,
  bag: 2500,
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function ensureStoragePoints(): Promise<void> {
  await db
    .insert(storagePointsTable)
    .values(defaultStoragePoints)
    .onConflictDoNothing({ target: storagePointsTable.id });
}

function normalizeListingInput(input: {
  name: string;
  cropType: string;
  price: number;
  unit: string;
  quantity: number;
  storagePointId: string;
  farmerName: string;
}) {
  return {
    name: input.name.trim(),
    cropType: input.cropType.trim(),
    price: input.price,
    unit: input.unit,
    quantity: input.quantity,
    availableQuantity: input.quantity,
    storagePointId: input.storagePointId,
    farmerName: input.farmerName.trim(),
  };
}

router.get("/marketplace/storage-points", async (_req, res): Promise<void> => {
  await ensureStoragePoints();
  const points = await db
    .select({
      id: storagePointsTable.id,
      name: storagePointsTable.name,
      type: storagePointsTable.type,
      district: storagePointsTable.district,
      state: storagePointsTable.state,
      address: storagePointsTable.address,
    })
    .from(storagePointsTable)
    .where(eq(storagePointsTable.active, true))
    .orderBy(storagePointsTable.district, storagePointsTable.name);

  res.json(ListStoragePointsResponse.parse(points));
});

router.get("/marketplace/listings", async (_req, res): Promise<void> => {
  const listings = await db
    .select({
      id: marketplaceListingsTable.id,
      name: marketplaceListingsTable.name,
      cropType: marketplaceListingsTable.cropType,
      price: marketplaceListingsTable.price,
      unit: marketplaceListingsTable.unit,
      quantity: marketplaceListingsTable.quantity,
      availableQuantity: marketplaceListingsTable.availableQuantity,
      storagePointId: marketplaceListingsTable.storagePointId,
      storagePointName: storagePointsTable.name,
      farmerName: marketplaceListingsTable.farmerName,
      createdAt: marketplaceListingsTable.createdAt,
    })
    .from(marketplaceListingsTable)
    .innerJoin(
      storagePointsTable,
      eq(marketplaceListingsTable.storagePointId, storagePointsTable.id),
    )
    .where(eq(marketplaceListingsTable.active, true))
    .orderBy(desc(marketplaceListingsTable.createdAt));

  res.json(ListMarketplaceListingsResponse.parse(listings));
});

router.post("/marketplace/listings", async (req, res): Promise<void> => {
  const parsed = CreateMarketplaceListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = normalizeListingInput(parsed.data);
  if (!input.name || !input.cropType || !input.farmerName) {
    res.status(400).json({ error: "Name, crop type, and farmer are required." });
    return;
  }

  const [storagePoint] = await db
    .select({ id: storagePointsTable.id })
    .from(storagePointsTable)
    .where(eq(storagePointsTable.id, input.storagePointId));
  if (!storagePoint) {
    res.status(400).json({ error: "Choose an available storage station." });
    return;
  }

  const [listing] = await db
    .insert(marketplaceListingsTable)
    .values(input)
    .returning();
  const [withStoragePoint] = await db
    .select({
      id: marketplaceListingsTable.id,
      name: marketplaceListingsTable.name,
      cropType: marketplaceListingsTable.cropType,
      price: marketplaceListingsTable.price,
      unit: marketplaceListingsTable.unit,
      quantity: marketplaceListingsTable.quantity,
      availableQuantity: marketplaceListingsTable.availableQuantity,
      storagePointId: marketplaceListingsTable.storagePointId,
      storagePointName: storagePointsTable.name,
      farmerName: marketplaceListingsTable.farmerName,
      createdAt: marketplaceListingsTable.createdAt,
    })
    .from(marketplaceListingsTable)
    .innerJoin(
      storagePointsTable,
      eq(marketplaceListingsTable.storagePointId, storagePointsTable.id),
    )
    .where(eq(marketplaceListingsTable.id, listing.id));

  res.status(201).json(CreateMarketplaceListingResponse.parse(withStoragePoint));
});

router.patch("/marketplace/listings/:id", async (req, res): Promise<void> => {
  const params = UpdateMarketplaceListingParams.safeParse(req.params);
  if (!params.success || !uuidPattern.test(params.data.id)) {
    res.status(400).json({ error: "Invalid listing ID." });
    return;
  }
  const parsed = UpdateMarketplaceListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = normalizeListingInput(parsed.data);
  if (!input.name || !input.cropType || !input.farmerName) {
    res.status(400).json({ error: "Name, crop type, and farmer are required." });
    return;
  }
  const [storagePoint] = await db
    .select({ id: storagePointsTable.id })
    .from(storagePointsTable)
    .where(eq(storagePointsTable.id, input.storagePointId));
  if (!storagePoint) {
    res.status(400).json({ error: "Choose an available storage station." });
    return;
  }

  const [listing] = await db
    .update(marketplaceListingsTable)
    .set(input)
    .where(eq(marketplaceListingsTable.id, params.data.id))
    .returning();
  if (!listing) {
    res.status(404).json({ error: "Listing not found." });
    return;
  }

  const [withStoragePoint] = await db
    .select({
      id: marketplaceListingsTable.id,
      name: marketplaceListingsTable.name,
      cropType: marketplaceListingsTable.cropType,
      price: marketplaceListingsTable.price,
      unit: marketplaceListingsTable.unit,
      quantity: marketplaceListingsTable.quantity,
      availableQuantity: marketplaceListingsTable.availableQuantity,
      storagePointId: marketplaceListingsTable.storagePointId,
      storagePointName: storagePointsTable.name,
      farmerName: marketplaceListingsTable.farmerName,
      createdAt: marketplaceListingsTable.createdAt,
    })
    .from(marketplaceListingsTable)
    .innerJoin(
      storagePointsTable,
      eq(marketplaceListingsTable.storagePointId, storagePointsTable.id),
    )
    .where(eq(marketplaceListingsTable.id, listing.id));

  res.json(UpdateMarketplaceListingResponse.parse(withStoragePoint));
});

router.delete("/marketplace/listings/:id", async (req, res): Promise<void> => {
  const params = DeleteMarketplaceListingParams.safeParse(req.params);
  if (!params.success || !uuidPattern.test(params.data.id)) {
    res.status(400).json({ error: "Invalid listing ID." });
    return;
  }
  const [listing] = await db
    .delete(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, params.data.id))
    .returning({ id: marketplaceListingsTable.id });
  if (!listing) {
    res.status(404).json({ error: "Listing not found." });
    return;
  }
  res.sendStatus(204);
});

router.get(
  "/marketplace/price-guidance",
  async (req, res): Promise<void> => {
    const parsed = GetMarketPriceGuidanceQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const cropType = parsed.data.cropType.trim();
    const unit = parsed.data.unit.trim().toLowerCase();
    const askingPrice = Number(parsed.data.askingPrice);
    if (!cropType || !Number.isFinite(askingPrice) || askingPrice <= 0) {
      res.status(400).json({ error: "Enter a crop and a positive asking price." });
      return;
    }

    const retailCap =
      simulatedRetailCaps[cropType.toLowerCase()] ?? unitRetailCaps[unit] ?? 100;
    const compressionPercent =
      Math.round(((retailCap - askingPrice) / retailCap) * 10000) / 100;
    const absPercent = Math.abs(compressionPercent).toFixed(1);
    const comparison =
      compressionPercent > 0
        ? `Your price is compressed by ${absPercent}% vs the simulated local retail cap through direct-to-consumer routing.`
        : compressionPercent < 0
          ? `Your asking price is ${absPercent}% above the simulated local retail cap.`
          : "Your asking price matches the simulated local retail cap.";

    res.json(
      GetMarketPriceGuidanceResponse.parse({
        cropType,
        unit,
        askingPrice,
        regionalRetailCap: retailCap,
        compressionPercent,
        comparison,
        sourceLabel:
          "Illustrative Assam retail caps for demo guidance only; not live market data.",
      }),
    );
  },
);

router.post("/marketplace/orders", async (req, res): Promise<void> => {
  const parsed = SubmitDemoOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const items = parsed.data.items.map((item) => ({
    ...item,
    name: item.name.trim(),
    productId: String(item.productId),
    storagePointName: item.storagePointName.trim(),
  }));
  if (items.some((item) => !item.name || !item.storagePointName)) {
    res.status(400).json({ error: "Each item must include a name and ship-from station." });
    return;
  }
  const calculatedTotal =
    Math.round(
      items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ) * 100,
    ) / 100;
  if (Math.abs(calculatedTotal - parsed.data.totalAmount) > 0.02) {
    res.status(400).json({ error: "The cart total changed. Refresh your cart and try again." });
    return;
  }

  const [order] = await db
    .insert(demoOrdersTable)
    .values({
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      totalAmount: calculatedTotal,
      status: "demo_received",
    })
    .returning();

  res.status(201).json(
    SubmitDemoOrderResponse.parse({
      id: order.id,
      itemCount: order.itemCount,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    }),
  );
});

export default router;
