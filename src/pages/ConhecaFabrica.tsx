import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ConhecaFabrica() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-8 text-center">
          Conheça a Fábrica Kepma
        </h1>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p className="text-lg">
            A <strong>Kepma</strong> é uma das maiores e mais avançadas fábricas de violões
            do mundo. Utilizando tecnologia de ponta, a marca <strong>não produz violões para terceiros</strong>{" "}
            e <strong>nenhum de seus violões é fabricado por terceiros</strong>, garantindo
            controle total sobre cada etapa da produção. É hoje uma das marcas chinesas mais
            conceituadas do mercado mundial de instrumentos.
          </p>

          <p>
            A Kepma Guitar é amplamente reconhecida como uma das instalações de fabricação
            de violões mais tecnologicamente avançadas do mundo, localizada em Changsha,
            província de Hunan, China. Fundada em 2009 por <em>Jack Peng</em> e{" "}
            <em>Kevin Liu</em>, ex-engenheiros mecânicos, a empresa se destaca pelo uso de
            automação de alta precisão para garantir consistência em larga escala.
          </p>

          <section>
            <h2 className="font-display text-2xl font-semibold mt-8 mb-4">
              📍 Localização e Infraestrutura
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Antiga sede:</strong> Localizada na área industrial de Yongfa, na
                cidade de Qishi, Dongguan, província de Guangdong.
              </li>
              <li>
                <strong>Nova expansão:</strong> Em 2023, a empresa inaugurou uma nova base
                de fabricação inteligente na zona de desenvolvimento econômico de Ningxiang,
                Hunan.
              </li>
              <li>
                <strong>Presença Global:</strong> Possui uma filial nos EUA (estabelecida em
                2017) e forte representação no Brasil através da Kepma Guitars Brasil.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mt-8 mb-4">
              🔬 Tecnologia de Produção ("Ciência e Arte")
            </h2>
            <p>
              A fábrica é famosa por integrar maquinário industrial de ponta no processo de
              luthieria:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Máquinas Plek®:</strong> Foi uma das primeiras na China a utilizar
                essa tecnologia alemã para nivelamento de trastes e ajuste de escala com
                precisão micrométrica.
              </li>
              <li>
                <strong>Robótica ABB:</strong> Utiliza braços robóticos (comuns na indústria
                automobilística) para os processos de pintura, lixamento e polimento.
              </li>
              <li>
                <strong>Corte a Laser e CNC:</strong> Equipamentos HAAS e Bacci são usados
                para garantir que cada componente seja idêntico, eliminando variações
                manuais.
              </li>
              <li>
                <strong>Câmara Anecóica:</strong> Realiza testes de som em ambiente
                controlado para analisar a resposta de frequência de seus modelos.
              </li>
              <li>
                <strong>Sala de Vibração:</strong> Os instrumentos da linha Elite passam por
                300 horas de "envelhecimento induzido" por vibração para simular anos de uso
                e abrir o timbre da madeira.
              </li>
            </ul>
          </section>

          <section className="bg-secondary/50 border border-border rounded-lg p-6 mt-8">
            <p className="m-0">
              <strong>🌟 Curiosidade:</strong> Em 2015, a Kepma tornou-se a marca número um
              de violões acústicos na China, superando gigantes tradicionais em volume de
              vendas no mercado doméstico.
            </p>
          </section>
        </article>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold mb-4 text-center">
            Veja a fábrica em vídeo
          </h2>
          <div className="relative w-full overflow-hidden rounded-lg border border-border shadow-lg" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/JCjSxSSqRqs?start=43"
              title="Conheça a fábrica Kepma"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
