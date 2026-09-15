import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export function SettingsPage() {
  const user = trpc.user.me.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Bangkok");

  useEffect(() => {
    if (user.data) {
      setName(user.data.name);
      setEmail(user.data.email);
      setTimezone(user.data.timezone);
    }
  }, [user.data]);

  const update = trpc.user.update.useMutation({
    onSuccess: async () => {
      await utils.user.me.invalidate();
      toast.success("Profile saved");
    },
    onError: (error) => toast.error(error.message),
  });

  if (user.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (user.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-6">
        <p className="font-medium">Could not load settings</p>
        <p className="mt-1 text-sm text-muted-foreground">{user.error.message}</p>
        <Button className="mt-4" variant="outline" onClick={() => user.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-serif text-4xl">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        One local profile for now. Accounts and login come after the tracking loop is solid.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Used for your name in the ledger and period boundaries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate({ name, email, timezone });
            }}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="mt-2 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.includes(timezone) ? null : <option value={timezone}>{timezone}</option>}
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={update.isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
