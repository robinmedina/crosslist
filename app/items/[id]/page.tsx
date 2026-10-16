import { Suspense } from "react";
import { ItemEditor } from "./item-editor";

export default function ItemPage({ params }: PageProps<"/items/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 pt-10 sm:px-8" />}>
      <ItemEditor params={params} />
    </Suspense>
  );
}
