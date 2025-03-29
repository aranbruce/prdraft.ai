import Form from "next/form";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
}: {
  action: any;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  return (
    <Form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="font-normal text-secondary-foreground"
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
          autoFocus
          defaultValue={defaultEmail}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="font-normal text-secondary-foreground"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="text-md bg-muted md:text-sm"
          type="password"
          placeholder="********"
          required
        />
      </div>

      {children}
    </Form>
  );
}
