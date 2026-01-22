import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex items-center justify-center flex-1 p-4 w-full">
      <SignUpForm />
    </div>
  );
}
