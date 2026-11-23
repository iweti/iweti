export interface ContactPayload {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  recebernovidades: boolean;
}

type NewsletterStatus = 'inscrito' | 'ja_inscrito' | 'nao_solicitada';

export type ContactResult =
  | { kind: 'success'; newsletter?: NewsletterStatus }
  | { kind: 'partial' }
  | { kind: 'error'; message: string };

const unknownOutcome =
  'Não foi possível confirmar o resultado do envio. Seus dados foram mantidos. A mensagem pode ter sido encaminhada; evite reenviá-la sem confirmar com a IWETI.';

export const CONTACT_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNewsletterStatus(value: unknown): value is NewsletterStatus {
  return value === 'inscrito' || value === 'ja_inscrito' || value === 'nao_solicitada';
}

export async function sendContact(apiUrl: string, payload: ContactPayload): Promise<ContactResult> {
  try {
    const response = await fetch(`${apiUrl.trim().replace(/\/+$/, '')}/contato`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(payload),
      // This is a client wait limit, not a guarantee that the API stopped sending.
      signal: AbortSignal.timeout(CONTACT_TIMEOUT_MS),
    });

    // Proxies can return HTML or an empty body, including on 400 and 429.
    const body: unknown = await response.json().catch(() => null);

    // A newsletter failure can happen after the contact was forwarded.
    if (
      isRecord(body) &&
      body.contato === 'encaminhado' &&
      (!response.ok || body.sucesso === false || body.newsletter === 'erro')
    ) {
      return { kind: 'partial' };
    }

    if (response.ok) {
      if (isRecord(body) && (body.sucesso === false || body.erro)) {
        return {
          kind: 'error',
          message: typeof body.erro === 'string' ? body.erro : unknownOutcome,
        };
      }

      if (!isRecord(body) || (body.sucesso !== true && body.contato !== 'encaminhado')) {
        return { kind: 'error', message: unknownOutcome };
      }

      return isNewsletterStatus(body.newsletter)
        ? { kind: 'success', newsletter: body.newsletter }
        : { kind: 'success' };
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

    if ([401, 403, 405].includes(response.status)) {
      return {
        kind: 'error',
        message:
          'O serviço de contato não autorizou o envio. Seus dados foram mantidos. Entre em contato com a IWETI pelo WhatsApp.',
      };
    }

    if (response.status === 503) {
      return {
        kind: 'error',
        message:
          'O serviço de contato está indisponível. Seus dados foram mantidos. Tente novamente mais tarde.',
      };
    }

    return { kind: 'error', message: unknownOutcome };
  } catch (error) {
    // A timeout, CORS failure or lost response does not prove the message
    // was not sent. There are deliberately no automatic retries.
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return {
      kind: 'error',
      message: timedOut ? `O serviço demorou para responder. ${unknownOutcome}` : unknownOutcome,
    };
  }
}
