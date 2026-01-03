import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { Suspense } from "react";
import Leads from "@/components/Leads";
import { Row, Col, Spinner } from "react-bootstrap";
import AddItem from "@/components/add-item";
import Lead from "@/components/Lead";
import LeadsServer from "@/components/LeadsServer";
import { toast } from "react-toastify";
import { NextResponse } from "next/server";

const toastSettings = {
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

const getTeamMembers = async () => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user");
      return { error: 'No authenticated user' };
    }

    const { data, error } = await supabase
      .from("leads")
      .select("id, organization, firstName, lastName, title, employees, rank")
      .eq("user_id", user.id)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error getting leads", error.message);
      return { error: "Error getting leads" };
    }
    return { result: data };
  } catch (error: any) {
    if (error instanceof Error) {
      console.error("Error getting leads", error.message);
      return { error: "Error getting leads" };
    } else {
      console.error("Unknown error getting leads", error);
      return { error: "Unknown error getting leads" };
    }
  }
}

async function Team() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const teamMembers = await getTeamMembers();

  if (teamMembers.result) {
    return <Leads leadProps={teamMembers.result} />;
  } else {
    toast.error(`Error getting leads${teamMembers.error ? `: ${teamMembers.error}` : ''}`, toastSettings);
    return <>No leads</>
  }
}

export default function Dashboard() {
  return (

    <div className="flex flex-col gap-3">
      <Row>
        <Col xs sm='auto' className='text-3xl font-semibold'>
          Leads
        </Col>
        <Col xs='auto'>
          <AddItem />
        </Col>
      </Row>
      <Row>
        <Col>
          <Suspense fallback={
            <Spinner />
            // <Row className="g-3">
            //   <Col xs='auto'>
            //     <Lead placeholder />
            //   </Col>
            // </Row>
          }>
            <Team />
          </Suspense>
        </Col>
      </Row>
    </div>
  );
}
