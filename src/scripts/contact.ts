import { sendContact, type ContactPayload } from '../lib/contact';
import { whatsappLink } from '../lib/whatsapp';
import { onPageLoad } from '../lib/page-lifecycle';

onPageLoad(() => {
  const form = document.querySelector<HTMLFormElement>('.contact-form');

  if (form) {
    const name = form.querySelector<HTMLInputElement>('[name="name"]');
    const email = form.querySelector<HTMLInputElement>('[name="email"]');
    const subject = form.querySelector<HTMLInputElement>('[name="subject"]');
    const message = form.querySelector<HTMLTextAreaElement>('[name="message"]');
    const newsletter = form.querySelector<HTMLInputElement>('[name="recebernovidades"]');
    const emailButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    const whatsapp = form.querySelector<HTMLButtonElement>('[data-contact-send="whatsapp"]');
    const emailLabel = emailButton?.querySelector<HTMLElement>('[data-contact-label]');
    const feedback = form.querySelector<HTMLElement>('.contact-feedback');

    if (
      name &&
      email &&
      subject &&
      message &&
      newsletter &&
      emailButton &&
      emailLabel &&
      feedback
    ) {
      let emailSending = false;
      let emailForwarded = false;

      const showFeedback = (text: string, state: 'success' | 'partial' | 'error') => {
        feedback.textContent = text;
        feedback.dataset.state = state;
        feedback.hidden = false;
      };

      const fields = [name, email, subject, message];

      const updateButtons = () => {
        const complete = fields.every((field) => field.value.trim() && field.validity.valid);
        const emailBlocked = emailSending || emailForwarded;
        emailButton.disabled = emailBlocked;
        emailButton.setAttribute('aria-disabled', String(!complete || emailBlocked));
        whatsapp?.setAttribute('aria-disabled', String(!complete));
      };

      const validate = () => {
        for (const field of fields) {
          field.setCustomValidity(field.value.trim() ? '' : 'Preencha este campo.');
        }

        // Text inputs already remove line breaks; also guard programmatic input.
        if (/[\r\n]/.test(subject.value)) {
          subject.setCustomValidity('O assunto não pode conter quebras de linha.');
        }

        updateButtons();
        return form.reportValidity();
      };

      for (const field of fields) {
        field.addEventListener('input', () => {
          field.setCustomValidity('');
          updateButtons();
        });
      }
      updateButtons();

      whatsapp?.addEventListener('click', () => {
        if (!validate()) return;

        const body = `Olá, meu nome é ${name.value.trim()}.\nAssunto: ${subject.value.trim()}\n${message.value.trim()}\nEmail: ${email.value.trim()}`;
        const url = whatsappLink(form.dataset.whatsappNumber, body);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (emailSending || emailForwarded || !validate()) return;

        const payload: ContactPayload = {
          nome: name.value.trim(),
          email: email.value.trim(),
          assunto: subject.value.trim(),
          mensagem: message.value.trim(),
          recebernovidades: newsletter.checked,
        };

        emailSending = true;
        updateButtons();
        emailLabel.textContent = 'Enviando…';
        emailButton.setAttribute('aria-busy', 'true');
        feedback.hidden = false;
        feedback.textContent = 'Enviando sua mensagem…';
        delete feedback.dataset.state;

        const waitingNotice = window.setTimeout(() => {
          feedback.textContent =
            'Ainda aguardando a confirmação do envio. Mantenha esta página aberta e não reenvie a mensagem.';
        }, 10_000);

        try {
          const result = await sendContact(form.dataset.apiUrl, payload);

          if (result.kind === 'success') {
            const newsletterMessages = {
              inscrito: ' Sua inscrição para receber novidades foi concluída.',
              ja_inscrito: ' Seu e-mail já estava inscrito para receber novidades.',
              nao_solicitada: '',
            };
            showFeedback(
              `Sua mensagem foi enviada com sucesso à equipe da IWETI.${result.newsletter ? newsletterMessages[result.newsletter] : ''}`,
              'success',
            );
            form.reset();
          } else if (result.kind === 'partial') {
            emailForwarded = true;
            showFeedback(
              'Sua mensagem já foi encaminhada à IWETI, mas não foi possível confirmar a inscrição nas novidades. Não é necessário reenviar a mensagem.',
              'partial',
            );
          } else {
            showFeedback(result.message, 'error');
          }
        } catch {
          showFeedback(
            'Não foi possível confirmar o envio. Seus dados foram mantidos. A mensagem pode ter sido encaminhada; confirme com a IWETI antes de reenviar.',
            'error',
          );
        } finally {
          window.clearTimeout(waitingNotice);
          emailSending = false;
          emailButton.removeAttribute('aria-busy');
          updateButtons();
          emailLabel.textContent = emailForwarded ? 'Mensagem encaminhada' : 'Enviar por e-mail';
        }
      });
    }
  }
});
