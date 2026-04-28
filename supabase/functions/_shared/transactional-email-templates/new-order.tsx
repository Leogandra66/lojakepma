import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Loja Kepma'

interface OrderItem {
  name: string
  quantity: number
  unit_price: number
  is_preorder?: boolean
}

interface NewOrderProps {
  orderId?: string
  customerName?: string
  customerEmail?: string
  total?: number
  amountDueNow?: number
  hasPreorderItems?: boolean
  items?: OrderItem[]
  createdAt?: string
}

const formatBRL = (v: number) =>
  `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`

const NewOrderEmail = ({
  orderId,
  customerName,
  customerEmail,
  total,
  amountDueNow,
  hasPreorderItems,
  items,
  createdAt,
}: NewOrderProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo pedido recebido na {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎸 Novo pedido recebido!</Heading>
        <Text style={text}>
          Um novo pedido acaba de ser criado na <strong>{SITE_NAME}</strong>.
        </Text>

        <Section style={infoBox}>
          <Text style={infoLine}>
            <strong>Pedido:</strong> {orderId ?? '—'}
          </Text>
          {createdAt && (
            <Text style={infoLine}>
              <strong>Data:</strong> {createdAt}
            </Text>
          )}
          {customerName && (
            <Text style={infoLine}>
              <strong>Cliente:</strong> {customerName}
            </Text>
          )}
          {customerEmail && (
            <Text style={infoLine}>
              <strong>E-mail:</strong> {customerEmail}
            </Text>
          )}
        </Section>

        {items && items.length > 0 && (
          <>
            <Heading style={h2}>Itens</Heading>
            <Section>
              {items.map((it, idx) => (
                <Text key={idx} style={itemLine}>
                  {it.quantity}× {it.name}
                  {it.is_preorder ? ' (encomenda)' : ''} —{' '}
                  {formatBRL(it.unit_price * it.quantity)}
                </Text>
              ))}
            </Section>
            <Hr style={hr} />
          </>
        )}

        <Section>
          <Text style={totalLine}>
            <strong>Total do pedido:</strong> {formatBRL(total ?? 0)}
          </Text>
          {hasPreorderItems && amountDueNow !== undefined && (
            <Text style={text}>
              <strong>A pagar agora:</strong> {formatBRL(amountDueNow)}
            </Text>
          )}
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Notificação automática — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewOrderEmail,
  subject: (data: Record<string, any>) =>
    `Novo pedido #${(data?.orderId ?? '').toString().slice(0, 8)} — ${SITE_NAME}`,
  displayName: 'Novo pedido',
  to: 'leogandra@gmail.com',
  previewData: {
    orderId: 'abcd1234-5678-90ef',
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    total: 4990,
    amountDueNow: 4990,
    hasPreorderItems: false,
    createdAt: new Date().toLocaleString('pt-BR'),
    items: [
      { name: 'Violão Kepma D1C', quantity: 1, unit_price: 2990 },
      { name: 'Capa Premium', quantity: 2, unit_price: 1000 },
    ],
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
}
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 16px',
}
const h2 = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '20px 0 8px',
}
const text = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 12px',
}
const infoBox = {
  backgroundColor: '#f7f5ef',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '12px 0',
}
const infoLine = {
  fontSize: '14px',
  color: '#333333',
  margin: '4px 0',
}
const itemLine = {
  fontSize: '14px',
  color: '#333333',
  margin: '4px 0',
}
const totalLine = {
  fontSize: '16px',
  color: '#1a1a1a',
  margin: '8px 0',
}
const hr = { borderColor: '#e6e6e6', margin: '20px 0' }
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '20px 0 0',
}
