"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/custom/auth-form";
import { SubmitButton } from "@/components/custom/submit-button";

import { login, LoginActionState } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");

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
      router.refresh();
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <div className="bg-background flex h-screen w-screen items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {" "}
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h3 className="text-2xl font-semibold">Login</h3>
          <p className="text-sm text-zinc-500">
            Use your email and password to log in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton>Login</SubmitButton>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              href="/sign-up"
              className="font-semibold text-zinc-800 hover:underline dark:text-zinc-200"
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
