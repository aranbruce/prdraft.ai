import Form from "next/form";

import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
}: {
  action: (formData: FormData) => void;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  return (
    <Form action={action} className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="email"
            className="font-normal text-zinc-600 dark:text-zinc-400"
          >
            Email Address
          </Label>

          <Input
            id="email"
            name="email"
            className="text-md bg-muted md:text-sm"
            type="email"
            placeholder="user@acme.com"
            autoComplete="email"
            required
            defaultValue={defaultEmail}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className="font-normal text-zinc-600 dark:text-zinc-400"
          >
            Password
          </Label>

          <Input
            id="password"
            name="password"
            className="text-md bg-muted md:text-sm"
            type="password"
            required
          />
        </div>
      </div>
      {children}
    </Form>
  );
}
