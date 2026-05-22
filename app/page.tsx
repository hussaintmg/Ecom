import Hero from "@/components/landing/Hero";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <div className="flex items-center justify-center gap-10 py-6">
        <Link href="/login">
          <button
            className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-black
        bg-white
        px-8
        py-6
        text-base
        font-semibold
        text-black
        shadow-md
        transition-all
        duration-300
        hover:-translate-y-1
        hover:bg-black
        hover:text-white
        hover:shadow-2xl
      "
          >
            <span className="relative z-10">Login</span>

            <span
              className="
          absolute
          inset-0
          -translate-x-full
          bg-black
          transition-transform
          duration-300
          group-hover:translate-x-0
        "
            />
          </button>
        </Link>

        <Link href="/signup">
          <button
            className="
        group
        relative
        overflow-hidden
        rounded-2xl
        bg-black
        px-8
        py-6
        text-base
        font-semibold
        text-white
        shadow-lg
        transition-all
        duration-300
        hover:-translate-y-1
        hover:scale-105
        hover:shadow-2xl
      "
          >
            <span className="relative z-10">Sign Up</span>

            <span
              className="
          absolute
          inset-0
          translate-y-full
          bg-white
          transition-transform
          duration-300
          group-hover:translate-y-0
        "
            />

            <span
              className="
          absolute
          inset-0
          z-10
          flex
          items-center
          justify-center
          text-black
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
            >
              Sign Up
            </span>
          </button>
        </Link>
      </div>
    </main>
  );
}
