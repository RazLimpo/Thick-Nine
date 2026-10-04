// app/messages/page.tsx

import { Suspense } from "react";
import MessagesClient from "./client";

export const metadata = {
  title: "Messages | Thick Nine",
  description: "Direct messages",
};

export default function MessagesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 40 }}>Loading messages…</p>}>
      <MessagesClient />
    </Suspense>
  );
}
