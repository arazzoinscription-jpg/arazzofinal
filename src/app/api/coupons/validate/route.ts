import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const Schema = z.object({ code: z.string().min(1), amount: z.number().min(0) });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ valid: false, reason: "Non authentifié" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ valid: false, reason: "Données invalides" }, { status: 400 });

  const admin = createAdminClient();
  const result = await validateCoupon(admin, parsed.data.code, parsed.data.amount);
  return NextResponse.json(result);
}
