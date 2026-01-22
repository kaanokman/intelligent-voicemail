import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import RentRoll from "@/components/RentRoll";
import { Row, Col, Spinner } from "react-bootstrap";
import AddItem from "@/components/add-item";

async function getRentRollData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data, error } = await supabase
    .from("rent_roll")
    .select("id, address, property, unit, tenant, lease_start, lease_end, sqft, monthly_payment, invalid_columns")
    .eq("user_id", user.id)
    .order("id", { ascending: true });
  if (error) {
    console.error("Error loading rent roll data:", error.message);
    return [];
  }
  return data ?? [];
}

async function RentRollPage() {
  const rentRollData = await getRentRollData();
  return <RentRoll rentRoll={[]} />;
}

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Row>
        <Col xs sm="auto" className="text-3xl font-semibold">Rent Roll</Col>
        <Col xs="auto"><AddItem /></Col>
      </Row>
      <Row>
        <Col>
          <Suspense fallback={<Spinner />}>
            <RentRollPage />
          </Suspense>
        </Col>
      </Row>
    </div>
  );
}
