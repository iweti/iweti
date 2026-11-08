import { sendContact, type ContactPayload } from '../lib/contact';

const form = document.querySelector<HTMLFormElement>('.contact-form');

if (form) {
  const name = form.querySelector<HTMLInputElement>('[name="name"]');
  const email = form.querySelector<HTMLInputElement>('[name="email"]');
  const subject = form.querySelector<HTMLInputElement>('[name="subject"]');
  const message = form.querySelector<HTMLTextAreaElement>('[name="message"]');
  const newsletter = form.querySelector<HTMLInputElement>('[name="recebernovidades"]');
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const whatsapp = form.querySelector<HTMLButtonElement>('[data-contact-send="whatsapp"]');
  const buttonLabel = button?.querySelector<HTMLElement>('[data-contact-label]');
  const feedback = form.querySelector<HTMLElement>('.contact-feedback');

  if (
    name &&
    email &&
    subject &&
    message &&
    newsletter &&
    button &&
    buttonLabel &&
    whatsapp &&
    feedback
  ) {
    let sending = false;
    let forwarded = false;

    const showFeedback = (text: string, state: 'success' | 'partial' | 'error') => {
      feedback.textContent = text;
      feedback.dataset.state = state;
      feedback.hidden = false;
    };

    const fields = [name, email, subject, message];

    const updateButtons = () => {
      const complete = fields.every((field) => field.value.trim() && field.validity.valid);
      for (const action of [button, whatsapp]) {
        action.disabled = sending || forwarded;
        action.setAttribute('aria-disabled', String(!complete || sending || forwarded));
      }
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

    whatsapp.addEventListener('click', () => {
      if (sending || forwarded || !validate()) return;

      const body = `Olá, meu nome é ${name.value.trim()}.\nAssunto: ${subject.value.trim()}\n${message.value.trim()}\nEmail: ${email.value.trim()}`;
      window.open(
        `https://wa.me/5511978538445?text=${encodeURIComponent(body)}`,
        '_blank',
        'noopener,noreferrer',
      );
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending || forwarded || !validate()) return;

      const payload: ContactPayload = {
        nome: name.value.trim(),
        email: email.value.trim(),
        assunto: subject.value.trim(),
        mensagem: message.value.trim(),
        recebernovidades: newsletter.checked,
      };

      sending = true;
      updateButtons();
      buttonLabel.textContent = 'Enviando…';
      form.setAttribute('aria-busy', 'true');
      feedback.hidden = false;
      feedback.textContent = 'Enviando sua mensagem…';
      delete feedback.dataset.state;

      const result = await sendContact(form.dataset.apiUrl || 'https://api.iweti.com', payload);

      if (result.kind === 'success') {
        const newsletterMessages = {
          inscrito: ' Sua inscrição para receber novidades foi concluída.',
          ja_inscrito: ' Seu e-mail já estava inscrito para receber novidades.',
          nao_solicitada: '',
        };
        showFeedback(
          `Sua mensagem foi encaminhada à equipe da IWETI.${newsletterMessages[result.newsletter]}`,
          'success',
        );
        form.reset();
      } else if (result.kind === 'partial') {
        forwarded = true;
        showFeedback(
          'Sua mensagem já foi encaminhada à IWETI, mas não foi possível confirmar a inscrição nas novidades. Não é necessário reenviar a mensagem.',
          'partial',
        );
      } else {
        showFeedback(result.message, 'error');
      }

      sending = false;
      form.removeAttribute('aria-busy');
      updateButtons();
      buttonLabel.textContent = forwarded ? 'Mensagem encaminhada' : 'Enviar por e-mail';
    });
  }
}
