"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/custom/auth-form";
import { LogoGoogle } from "@/components/custom/icons";
import { SubmitButton } from "@/components/custom/submit-button";
import { Button } from "@/components/ui/button";

import { login, LoginActionState, loginWithProvider } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    },
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast.error("Invalid credentials!");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status === "success") {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  const handleLoginWithProvider = (provider: string) => {
    loginWithProvider(provider);
  };

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-4 px-4 sm:px-16">
        <div className="flex flex-col items-stretch justify-center gap-4 text-center">
          <div className="flex flex-col items-stretch justify-center gap-2 text-center">
            <h3 className="text-xl font-semibold text-primary">Log In</h3>
            <p className="text-sm text-secondary-foreground">
              Use your email and password to log in
            </p>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-3 text-center">
            <Button
              variant="default"
              onClick={() => handleLoginWithProvider("google")}
            >
              <LogoGoogle />
              Login with Google
            </Button>
            <Button
              variant="default"
              onClick={() => handleLoginWithProvider("github")}
            >
              Login with GitHub
            </Button>
          </div>
        </div>
        <p className="text-center text-sm text-secondary-foreground">Or</p>

        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Login</SubmitButton>
          <p className="mt-4 text-center text-sm text-secondary-foreground">
            {"Don't have an account? "}
            <Link
              href="/sign-up"
              className="font-semibold text-primary hover:text-primary/80"
            >
              Sign up
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
