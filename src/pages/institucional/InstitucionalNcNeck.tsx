import { InstitutionalLayout } from "./shared";
import neckJointPhoto from "@/assets/nc-neck-encaixe.webp.asset.json";
import neckSystemDiagram from "@/assets/nc-neck-sistema.webp.asset.json";
import neckBoltsDiagram from "@/assets/nc-neck-parafusos.webp.asset.json";
import neckCompleteDiagram from "@/assets/nc-neck-diagrama-completo.webp.asset.json";

const advantages = [
  {
    title: "Facilidade de regulagem (Neck Reset)",
    text: "Como o braço não é colado, um luthier consegue desmontá-lo rapidamente caso seja necessário corrigir o ângulo após anos de tensão das cordas, evitando cirurgias complexas na madeira.",
  },
  {
    title: "Estabilidade climática",
    text: "A junção mecânica firme, aliada aos reforços internos, reduz a deformação causada por variações de umidade e temperatura.",
  },
  {
    title: "Conforto e tocabilidade",
    text: "A precisão do encaixe trabalha em conjunto com o nivelamento de trastes feito por máquinas PLEK na fábrica da Kepma Brasil, entregando ação de cordas baixa e uniforme.",
  },
];

export default function InstitucionalNcNeck() {
  return (
    <InstitutionalLayout title="NC Neck">
      <section className="container grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.4em] text-primary">Tecnologia Kepma</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-tight md:text-7xl">NC Neck</h1>
          <p className="mt-4 font-display text-2xl text-background/90 md:text-3xl">Precisão que conecta braço e corpo.</p>
          <p className="mt-6 max-w-2xl leading-relaxed text-background/70 md:text-lg">
            A tecnologia Kepma NC Neck (ou NC Neck Joint) é um sistema patenteado de junção parafusada de alta precisão entre o braço e o corpo do violão, desenvolvido pela fabricante Kepma Guitars. Ele substitui a colagem tradicional por um encaixe mecânico usinado por computador (CNC), facilitando a manutenção e melhorando a estabilidade do instrumento.
          </p>
        </div>
        <figure className="min-w-0 overflow-hidden rounded-3xl border border-background/10 bg-background/5">
          <img
            src={neckJointPhoto.url}
            alt="Encaixe de alta precisão entre o braço e o corpo de um violão Kepma"
            className="aspect-[4/3] h-auto w-full object-cover"
            fetchPriority="high"
          />
        </figure>
      </section>

      <section className="border-y border-background/10 bg-background/[0.03]">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.4em] text-primary">Engenharia Kepma</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Como funciona o sistema</h2>
          </div>

          <div className="mt-12 space-y-16 md:mt-16 md:space-y-24">
            <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">01</p>
                <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">Usinagem CNC de precisão</h3>
                <p className="mt-4 leading-relaxed text-background/70 md:text-lg">
                  Tanto o encaixe no corpo (neck block) quanto o salto do braço são esculpidos por máquinas CNC com tolerância próxima a zero. Isso garante contato total entre as madeiras para máxima transferência de vibração e sustain.
                </p>
              </div>
              <figure className="min-w-0 overflow-hidden rounded-3xl border border-background/10 bg-background/5">
                <img
                  src={neckSystemDiagram.url}
                  alt="Diagrama do encaixe NC Neck entre o braço e o corpo do violão"
                  className="aspect-[8/5] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </article>

            <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <figure className="min-w-0 overflow-hidden rounded-3xl border border-background/10 bg-background/5 lg:order-1">
                <img
                  src={neckBoltsDiagram.url}
                  alt="Representação da fixação do braço ao corpo por parafusos internos"
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <div className="min-w-0 lg:order-2">
                <p className="text-sm font-medium text-primary">02</p>
                <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">Fixação parafusada (Bolt-on)</h3>
                <p className="mt-4 leading-relaxed text-background/70 md:text-lg">
                  Em vez de cola, o braço é preso ao corpo por parafusos internos. Esse design é inspirado na construção moderna de violões de ponta, como o sistema NT da Taylor.
                </p>
              </div>
            </article>

            <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">03</p>
                <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">Reforço estrutural interno</h3>
                <p className="mt-4 leading-relaxed text-background/70 md:text-lg">
                  Nos modelos da linha Elite e superiores, o braço conta com um tensor de ação dupla ladeado por duas hastes de fibra de carbono. Isso permite um perfil em “C” mais fino e confortável sem risco de empenamento.
                </p>
              </div>
              <figure className="mx-auto w-full max-w-xl min-w-0 overflow-hidden rounded-3xl border border-background/10 bg-background">
                <img
                  src={neckCompleteDiagram.url}
                  alt="Diagrama técnico do NC Neck com tensor, hastes de fibra de carbono e parafusos de fixação"
                  className="h-auto w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </article>
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.4em] text-primary">Na prática</p>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Principais vantagens para o músico</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {advantages.map((advantage, index) => (
            <article key={advantage.title} className="rounded-3xl border border-background/10 bg-background/[0.03] p-6 md:p-8">
              <p className="text-sm font-medium text-primary">0{index + 1}</p>
              <h3 className="mt-4 font-display text-xl font-bold md:text-2xl">{advantage.title}</h3>
              <p className="mt-4 leading-relaxed text-background/70">{advantage.text}</p>
            </article>
          ))}
        </div>
      </section>
    </InstitutionalLayout>
  );
}
