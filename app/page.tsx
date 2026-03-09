import Navbar from "../components/landing/navbar";
import Hero from "../components/landing/hero";
import Features from "../components/landing/features";
import CharactersPreview from "../components/landing/characters-preview";
import Footer from "../components/landing/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.12),transparent_28%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(to_bottom,#07070b,#0a0a0f)]" />
        <div className="absolute left-1/2 top-[-120px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-pink-500/16 blur-3xl" />
        <div className="absolute right-[-80px] top-[220px] h-[320px] w-[320px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute left-[-100px] bottom-[120px] h-[280px] w-[280px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative">
          <Navbar />
          <Hero />
          <Features />
          <CharactersPreview />
          <Footer />
        </div>
      </div>
    </main>
  );
}
