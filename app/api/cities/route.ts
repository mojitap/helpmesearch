// app/api/cities/route.ts
import { NextResponse } from "next/server";

// まずは必要な県から埋めていけばOK。随時追加で。
const CITY_BY_PREF: Record<string, string[]> = {
  "青森県": ["青森市","弘前市","八戸市","黒石市","五所川原市","十和田市","三沢市","むつ市","つがる市","平川市"],
  "岩手県": ["盛岡市","宮古市","大船渡市","花巻市","北上市","久慈市","遠野市","一関市","陸前高田市","釜石市"],
  // …他県も同様に
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pref = searchParams.get("pref") || "";
  const items = CITY_BY_PREF[pref] || [];
  return NextResponse.json({ items });
}