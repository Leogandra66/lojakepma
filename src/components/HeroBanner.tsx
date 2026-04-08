import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import kepmaLogo from "@/assets/kepma-logo.webp";
import heroBg from "@/assets/hero-bg.jpg";

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden">
      <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" width={1920} height={800} />
      <div className="absolute inset-0 bg-foreground/70" />
      <div className="container relative flex flex-col items-center justify-center gap-6 py-20 text-center lg:py-28">
        <img src={kepmaLogo} alt="Kepma" className="h-24 w-auto invert" />
        <h1 className="font-heading text-3xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
          Qualidade que você merece
        </h1>
        <p className="max-w-xl text-base text-primary-foreground/70 sm:text-lg">
          Descubra nossa coleção exclusiva. Produtos em estoque com entrega rápida ou encomendas com condições especiais.
        </p>
        <Link to="#produtos">
          <Button size="lg" className="btn-gold rounded-full px-8 text-base gap-2">
            Ver Produtos <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
