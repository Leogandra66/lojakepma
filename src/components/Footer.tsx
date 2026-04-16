import { Link } from "react-router-dom";
import kepmaLogo from "@/assets/kepma-logo.webp";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50 py-8">
      <div className="container flex flex-col items-center gap-4 text-center">
        <img src={kepmaLogo} alt="Kepma" className="h-8 w-auto opacity-60" />
        <nav className="flex gap-6 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Produtos
          </Link>
          <Link to="/historia" className="text-muted-foreground hover:text-foreground transition-colors">
            História da Kepma
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kepma. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
