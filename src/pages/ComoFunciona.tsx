import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CreditCard, PackageCheck, ShieldCheck } from "lucide-react";

export default function ComoFunciona() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container flex-1 py-12 max-w-4xl">
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 text-center">
          Como funciona nosso site
        </h1>
        <p className="text-center text-muted-foreground mb-12 italic">
          Entenda os tipos de produtos disponíveis e como realizar sua compra com segurança.
        </p>

        <article className="space-y-10 text-foreground leading-relaxed">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <PackageCheck className="h-7 w-7 text-primary" />
              <h2 className="font-heading text-2xl font-semibold">
                Produtos com a tag <Badge className="ml-1 align-middle">Em estoque</Badge>
              </h2>
            </div>
            <p>
              São produtos que já estão fisicamente em nosso estoque, prontos para
              <strong> pronta entrega</strong>. Após a confirmação do pagamento, seu pedido é
              separado e enviado o mais rápido possível.
            </p>
            <ul className="mt-4 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>Disponibilidade imediata para envio.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>Pagamento integral no momento da compra.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>Sem espera por reposição ou importação.</span>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-7 w-7 text-primary" />
              <h2 className="font-heading text-2xl font-semibold">
                Produtos com a tag <Badge variant="secondary" className="ml-1 align-middle">Encomenda</Badge>
              </h2>
            </div>
            <p>
              São produtos que ainda <strong>não estão em nosso estoque</strong>, mas já possuem
              <strong> programação de chegada</strong> definida com nossos fornecedores. Para esses
              modelos, abrimos a venda por encomenda, garantindo que você reserve a sua unidade
              antes mesmo da chegada do lote.
            </p>

            <div className="mt-5 rounded-md border border-border bg-muted/40 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm">
                  <strong>Atenção:</strong> os lotes de encomenda têm <strong>quantidade restrita</strong>.
                  Recomendamos efetuar a reserva o quanto antes para evitar que o produto chegue
                  já esgotado.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-6 w-6 text-primary" />
                <h3 className="font-heading text-xl font-semibold">Como funciona o pagamento da encomenda</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>
                    <strong>40% do valor</strong> é pago no ato da compra para
                    <strong> reservar a sua unidade</strong> no lote.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>
                    Os <strong>60% restantes</strong> são pagos somente na
                    <strong> entrega do item</strong>, após a chegada do produto.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>
                    Você acompanha todas as atualizações do seu pedido pela sua conta e pelo nosso
                    WhatsApp.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section className="text-center">
            <p className="text-muted-foreground">
              Ficou com alguma dúvida? Fale com a gente pelo botão de WhatsApp no canto da tela —
              teremos prazer em ajudar você a escolher a guitarra ideal.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
