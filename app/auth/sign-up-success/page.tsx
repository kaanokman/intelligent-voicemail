import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Page() {
    return (
        <div className="flex items-center justify-center flex-1 p-4 w-full h-100">
            <div className="w-full max-w-sm pb-5">
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                Thank you for signing up!
                            </CardTitle>
                            <CardDescription>Check your email to confirm</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                You&apos;ve successfully signed up. Please check your email to
                                confirm your account before signing in.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
