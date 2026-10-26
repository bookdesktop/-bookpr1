"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BaqPicker() {
  const router = useRouter();

  return (
    <form
      className="flex gap-2"
      action={(formData) => {
        const id = String(formData.get("baqId") ?? "").trim();
        if (id) router.push(`/baq/${encodeURIComponent(id)}`);
      }}
    >
      <input
        name="baqId"
        placeholder="BAQ ID เช่น zCustomerList"
        className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        required
      />
      <Button type="submit">แสดงข้อมูล</Button>
    </form>
  );
}
