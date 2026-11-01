import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; email?: string; phone?: string; createdAt?: string }

const Email = ({ name, email, phone, createdAt }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo interessado no Kepma DAS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Novo interessado — Kepma DAS</Heading>
        <Text style={text}><strong>Nome:</strong> {name || '-'}</Text>
        <Text style={text}><strong>E-mail:</strong> {email || '-'}</Text>
        <Text style={text}><strong>Telefone:</strong> {phone || '-'}</Text>
        <Text style={muted}>Recebido em {createdAt || '-'} pela página de pré-lançamento.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Interessado Kepma DAS: ${d.name ?? ''}`,
  to: 'leo@lmgbrasil.com.br',
  displayName: 'Interessado pré-lançamento DAS',
  previewData: { name: 'João', email: 'joao@exemplo.com', phone: '(31) 99999-9999', createdAt: '01/11/2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '20px', color: '#111' }
const text = { fontSize: '14px', color: '#222' }
const muted = { fontSize: '12px', color: '#777' }
