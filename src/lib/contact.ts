export interface ContactPayload {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  recebernovidades: boolean;
}

type NewsletterStatus = 'inscrito' | 'ja_inscrito' | 'nao_solicitada';

export type ContactResult =
  | { kind: 'success'; newsletter: NewsletterStatus }
  | { kind: 'partial' }
  | { kind: 'error'; message: string };

const unknownOutcome =
  'Não foi possível confirmar o resultado do envio. Seus dados foram mantidos. A mensagem pode ter sido encaminhada; evite reenviá-la sem confirmar com a IWETI.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNewsletterStatus(value: unknown): value is NewsletterStatus {
  return value === 'inscrito' || value === 'ja_inscrito' || value === 'nao_solicitada';
}

export async function sendContact(apiUrl: string, payload: ContactPayload): Promise<ContactResult> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/contato`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(payload),
      // This is a client wait limit, not a guarantee that the API stopped sending.
      signal: AbortSignal.timeout(30_000),
    });

    const body: unknown = await response.json();

    // A 502 can represent a contact that was already forwarded. Check this
    // before the HTTP status so the visitor does not resend the message.
    if (isRecord(body) && body.contato === 'encaminhado') {
      if (response.ok && body.sucesso === true && isNewsletterStatus(body.newsletter)) {
        return { kind: 'success', newsletter: body.newsletter };
      }

      return { kind: 'partial' };
    }

    if (response.status === 429) {
      return {
        kind: 'error',
        message:
          'O limite de envios foi atingido. Aguarde antes de tentar novamente. Seus dados foram mantidos.',
      };
    }

    if (response.status === 400) {
      return {
        kind: 'error',
        message:
          isRecord(body) && typeof body.erro === 'string'
            ? body.erro
            : 'Confira os dados preenchidos antes de enviar novamente.',
      };
    }

    return { kind: 'error', message: unknownOutcome };
  } catch {
    // A timeout, CORS failure or lost response does not prove the message
    // was not sent. There are deliberately no automatic retries.
    return { kind: 'error', message: unknownOutcome };
  }
}
