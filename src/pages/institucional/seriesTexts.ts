// Textos editoriais curados apenas para as páginas institucionais.
// Não altera descrições de produto na loja B2C, no B2B nem no Bling.

export type SeriesTextBlock = { heading?: string; body: string };

export type Spec = { label: string; value: string };

// Diferenciação de construção dos violões Kepma, complementando a especificação do braço
// em todas as séries do institucional.
export const NECK_JOINT_NOTE = "Braço parafusado (Kepma developed NC neck joint)";

export function applyNeckJointNote(rows: Spec[]): Spec[] {
  const i = rows.findIndex((r) => /^bra[çc]o$/i.test(r.label.trim()));
  if (i === -1) {
    const anchor = rows.findIndex((r) => /fundo\s*&\s*lados/i.test(r.label));
    const at = anchor === -1 ? 0 : anchor + 1;
    return [...rows.slice(0, at), { label: "Braço", value: NECK_JOINT_NOTE }, ...rows.slice(at)];
  }
  const material = rows[i].value
    .replace(/parafusado\s*\([^)]*\)/gi, "")
    .replace(/[\s—–-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return [
    ...rows.slice(0, i),
    { ...rows[i], value: material ? `${material} — ${NECK_JOINT_NOTE}` : NECK_JOINT_NOTE },
    ...rows.slice(i + 1),
  ];
}

// Descrição técnica curada por série (exibida somente na página institucional da série,
// no lugar da descrição vinda do catálogo). Não altera produtos na loja B2C, no B2B nem no Bling.
export const SERIES_DESCRIPTIONS: Record<string, string> = {
  // Os formatos da A1 são exibidos pela linha "Shapes de corpo" já curada para a série.
  A1: `Tampo: Sitka Spruce maciço de grau AAA (quarter sawn selecionado - serrado)
Fundo & lados: Mogno africano maciço de grau AAA
Sistema de travessas: X escalopadas
Espessura do tampo: 3,2 mm ± 0,2 mm
Braço: Mogno africano / formato C
Usinagem do braço: Todo usinado por máquina CNC
Reforço do braço: Hastes duplas de fibra de carbono
Tecnologia: Trastes PLEK®
Escala & ponte: Ébano africano
Ponte & pinos da ponte: Ébano
Marcações da escala: Golfinhos em madrepérola
Filetes: Maple com rosewood
Roseta: Madrepérola
Tarraxas: Kepma advanced douradas 1:18
Pestana & rastilho: TUSQ® (marfim artificial)
Cordas: Elixir® Acoustic 80/20 Bronze com NANOWEB 012-053
Tensor: Ajustável de 2 vias
Headstock Overlay: Ébano de 2 mm
Inlay do headstock: Madrepérola
Comprimento de escala: 647,25 mm
Largura da pestana: 43 mm
Largura no 14º traste: 54 mm
Número de trastes: 20
Material do traste: Albata (1,0 × 2,0 mm)
Estojo: Estojo rígido de luxo TKL
Kit de boas-vindas: Gratuito — pano de microfibra + chave Allen + 2 palhetas + 2 pinos de ponte`,
  "F0B Fênix": `Corpo: Grand Auditorium
Top: HTT AA Stika Spruce Maciço
Fundo & lados: Laminado de mogno africano
Braço: Mogno C/shape
Acabamento: Fosco - Verniz a base de água ultrafino
Headstock Overlay: HPL
Pestana & rastilho: Osso com compensador triplo
Escala & ponte: Rosewood
Comprimento de escala: 647.25mm
Bracing: X Bracing
Roseta: ABS
Number of Frets: 20
Marcações da escala: Acrylic
Filetes: ABS preto e branco
Pinos de ponte: ABS
Tensor: Dupla ação
Finish: Tampo Brilhante e fundo & lados foscos
Escudo: Tortoise
Cordas: Wild bee Phosphor Bronze 012
Tarraxas: Diecast cromadas
Eletrônica: KEPMA K10 Pro com efeitos e App - Kepma K11
Gig Bag: Kepma Gig bag`,
  "F0 Pro": `Corpo: Grand Auditorium
Top: HTT AA Stika Spruce Maciço
Fundo & lados: Laminado de mogno africano
Braço: Mogno C/shape
Acabamento: Smooth Satin - Fosco
Headstock Overlay: HPL
Pestana & rastilho: Osso com compensador triplo
Escala & ponte: Rosewood
Tecnologia: Plek
Comprimento de escala: 647.25mm
Bracing: X Bracing
Roseta: ABS
Number of Frets: 20
Marcações da escala: Acrylic
Filetes: ABS preto e branco
Pinos de ponte: ABS
Tensor: Dupla ação
Finish: Tampo Brilhante e fundo & lados foscos
Escudo: Tortoise
Cordas: D'Addario XS
Tarraxas: Diecast cromadas
Gig Bag: Kepma Deluxe Bag`,
  // O "Corpo" da F1 é exibido pela linha "Shapes de corpo" (seriesAccessories.SERIES_BODY_SHAPES).
  F1: `Tampo: Abeto Sitka maciço de grau AA (quarter sawn selecionado)
Espessura do tampo: 3,2 mm ± 0,2 mm
Fundo & lados: Mogno africano laminado
Sistema de travessas: Padrão X recortado
Braço: Mogno africano / formato C
Usinagem do braço: Todo usinado por máquina CNC
Escala & ponte: Rosewood
Tecnologia: Plek
Pestana & rastilho: Osso
Comprimento de escala: 647,25 mm
Largura da porca: 43 mm
Largura no 14º traste: 54 mm
Número de trastes: 20
Material do traste: Albata (1,0 × 2,0 mm)
Tarraxas: Fundidas sob pressão KEPMA de alta qualidade`,
};

export const SERIES_TEXTS: Record<string, SeriesTextBlock[]> = {
  "FC Mini": [
    {
      body: `Ao pensar em violões compactos para viagem, geralmente se pensa em um som menor. Uma espécie de compromisso – violão menor = menos volume, timbre mais fraco, etc. Bem, isso acabou… superamos as desvantagens dos violões menores e criamos uma série de violões de tamanho ¾ que produzem o timbre e o volume de um violão de tamanho normal.`,
    },
    {
      body: `O novo violão Kepma FC Mini ¾ Cutaway, tecnologicamente avançado, oferece melhorias sonoras significativas para um instrumento de tamanho ¾, fazendo com que ele soe e toque como um violão acústico de tamanho normal. E, por ser cutaway, você tem acesso total ao braço, podendo executar solos acústicos incríveis em toda a extensão do braço.`,
    },
    {
      body: `Existem diversas inovações e características exclusivas que diferenciam esses violões dos demais... além do preço/valor. A Kepma é uma empresa focada em tecnologia, com o objetivo de combinar ciência e arte para produzir os melhores instrumentos do mundo.`,
    },
    {
      heading: `Primeiro, o tampo sólido…`,
      body: `Já mencionamos que este violão tem um tampo sólido torreficado? O processo exclusivo de torrefação da Kepma utiliza uma combinação de calor e umidade controlados durante um determinado período para extrair a umidade, os óleos e a seiva das estruturas celulares da madeira para a superfície, que é então lixada. Não nos limitamos a "cozinhar" e "queimar" a madeira como outros fabricantes — este processo adiciona resistência e estabilidade extras aos tampos, tornando-os menos reativos às mudanças nas condições atmosféricas. Cada tampo sólido da Kepma passa por este processo altamente controlado, resultando em tampos que reagem melhor à vibração das cordas, são mais "vibrantes" e definitivamente mais estáveis.`,
    },
    {
      heading: `Design exclusivo de braço aparafusado em 4 pontos redesenhado`,
      body: `A série FC Mini utiliza a tecnologia proprietária de encaixe aparafusado NC da Kepma. O braço e o corpo são fabricados individualmente com meticulosidade e precisão, garantindo uma junção perfeita e estável após a adição dos parafusos.`,
    },
    {
      body: `Além disso, se você é do tipo que detesta o acúmulo de acabamento ao redor da junção em cauda de andorinha, este design é definitivamente para você. A nova junção do braço Kepma oferece o máximo em ajuste infinito para se adequar ao seu estilo e preferências, tornando a manutenção futura fácil e sem complicações.`,
    },
    {
      heading: `Haste de tensão mais curta`,
      body: `A haste de tensão FC Mini é uma haste de tensão bidirecional menor, com 355 mm. A haste mais curta proporciona maior estabilidade ao braço sem enfraquecer a junção do braço, onde "protuberâncias" poderiam se formar devido a uma haste mais longa. O ajuste bidirecional permite que você ajuste a tensão das cordas de acordo com sua preferência. Essa abordagem de ajuste é adotada por três grandes fabricantes de violões acústicos.`,
    },
    {
      heading: `Acabamento à base de água e espessura reduzida`,
      body: `A série FC Mini apresenta um acabamento fosco à base de água mais fino — 0,052 mm (ou 52/1000 de milímetro). A espessura reduzida do acabamento minimiza o efeito de amortecimento nas vibrações do tampo, resultando em um violão com um som mais claro e transparente.`,
    },
    {
      heading: `Topo mais fino`,
      body: `A série FC Mini utiliza um tampo de abeto maciço mais fino, com 2,75 mm de espessura. Essa redução na espessura facilita a vibração em um único estágio no tampo, aprimorando significativamente as frequências graves, que normalmente são um desafio para violões menores… um som de violão grande em um violão de tamanho ¾.`,
    },
    {
      heading: `Tecnologia Arch Back`,
      body: `A série FC Mini apresenta um fundo arqueado, uma característica distinta em comparação com outros modelos tradicionais de fundo plano de tamanho ¾. O fundo arqueado aumenta o volume da caixa de ressonância do violão. Essa curvatura também permite uma reflexão, refração e interação sonora mais flexíveis e diversificadas devido aos ângulos de projeção exclusivos.`,
    },
    {
      heading: `Sistema de leque do fundo removido`,
      body: `Com a adição do design de fundo arqueado, descobrimos que realmente não havia necessidade do sistema de reforço na parte de trás, então o removemos. Isso proporciona uma vibração e um som geral mais harmoniosos para o violão.`,
    },
  ],
};
