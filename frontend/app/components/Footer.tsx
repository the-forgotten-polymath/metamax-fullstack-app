import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/40 bg-white/24 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 pb-7 pt-9 sm:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/metamaxx.png" alt="Metamax logo" width={28} height={28} className="h-6 w-auto" />
              <span className="text-[15px] font-medium text-[#0A0A0F]">Metamax</span>
            </div>
            <p className="mt-3 text-xs text-[#9CA3AF]">Free SEO + performance intelligence.</p>
          </div>

          <div className="flex gap-6 text-[13px] font-light text-[#616674]">
            <Link href="#" className="transition hover:text-[#0A0A0F]">
              Privacy
            </Link>
            <Link href="#" className="transition hover:text-[#0A0A0F]">
              Terms
            </Link>
          </div>
        </div>

        <p className="text-xs text-[#9CA3AF]">&copy; 2026 Metamax. Built for the open web.</p>
      </div>
    </footer>
  );
}
