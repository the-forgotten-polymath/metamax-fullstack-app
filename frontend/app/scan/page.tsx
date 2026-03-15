import { Suspense } from "react";
import ScanClient from "../components/ScanClient";

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(245,247,255,0.38)),url('/b2.jpg')] bg-cover bg-bottom" />}>
      <ScanClient />
    </Suspense>
  );
}
