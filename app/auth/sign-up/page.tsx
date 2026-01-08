import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 min-h-screen w-full items-center justify-center p-6 md:p-10">
      <Link href={"/"} className="text-3xl font-semibold text-primary no-underline" style={{ textDecoration: 'none' }}>
        Kaan's Proda Project
      </Link>
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
