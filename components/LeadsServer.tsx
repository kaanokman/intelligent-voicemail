// /dashboard/leads/TeamData.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Row, Col } from "react-bootstrap";
import Lead from "@/components/Lead";

export default async function LeadsServer() {

  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims) redirect("/auth/login");

  const { data: teamMembers, error: membersError } = await supabase
    .from("leads")
    .select("id, organization, firstName, lastName, title")
    // .eq("user_id", user.id)
    .order("id", { ascending: true });

  if (membersError) console.error(membersError);

  // await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 sec delay

  return (
    <Row className="g-3">
      {teamMembers?.map((item) => (
        <Col key={item.id} xs='auto'>
          <Lead item={item} />
        </Col>
      ))}
    </Row>
  );
}
