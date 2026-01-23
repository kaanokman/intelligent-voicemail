import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
    return (
        <div className="flex items-center justify-center flex-1 p-4 w-full h-100">
            <div className="w-full max-w-sm pb-5">
                <ForgotPasswordForm />
            </div>
        </div>
    );
}
