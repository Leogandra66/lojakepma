import kepmaLogo from "@/assets/kepma-logo.webp";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50 py-8">
      <div className="container flex flex-col items-center gap-4 text-center">
        <img src={kepmaLogo} alt="Kepma" className="h-8 w-auto opacity-60" />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kepma. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
