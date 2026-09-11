import { createTelemetryRouteHandler } from "@/lib/minecraft/telemetry-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createTelemetryRouteHandler();
