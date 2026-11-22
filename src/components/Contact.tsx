import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Github,
  Linkedin,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

gsap.registerPlugin(ScrollTrigger);

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim() ?? '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim() ?? '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim() ?? '';

type SubmissionNotice = {
  type: 'success' | 'error';
  message: string;
};

interface ContactItem {
  key: 'phone' | 'whatsapp' | 'email' | 'linkedin' | 'github' | 'location';
  label: string;
  value: string;
  enabled: boolean;
  href: string;
  icon: LucideIcon;
  iconOnlyIcon?: LucideIcon;
  iconOnlyHref?: string;
}

const cleanText = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export const Contact: React.FC = () => {
  const { content } = usePortfolio();
  const { contactSettings } = content;
  const SITE = content.site;
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<SubmissionNotice | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '', website: '' });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })
        .fromTo(titleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
        .fromTo(cardRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '-=0.3');
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendingRef.current) return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (formData.website.trim()) {
      setNotice({ type: 'error', message: 'We could not submit this message. Please refresh the page and try again.' });
      return;
    }

    const name = cleanText(formData.name);
    const email = cleanText(formData.email);
    const phone = cleanText(formData.phone);
    const subject = cleanText(formData.subject);
    const message = cleanText(formData.message);
    const emailField = form.elements.namedItem('email');
    if (!name || name.length > 120 || !email || email.length > 254 || !subject || subject.length > 180 ||
      !message || message.length > 5000) {
      setNotice({ type: 'error', message: 'Please check the required fields and their length limits.' });
      return;
    }
    if (phone && !/^\+?[0-9][0-9 ()-]{5,39}$/.test(phone)) {
      setNotice({ type: 'error', message: 'Please enter a valid phone number or leave the optional field empty.' });
      return;
    }
    if (!(emailField instanceof HTMLInputElement) || !emailField.validity.valid) {
      setNotice({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    if (!supabase) {
      setNotice({ type: 'error', message: supabaseConfigurationError ?? 'The contact form is not connected. Please try again later.' });
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    setNotice(null);
    try {
      const { error } = await supabase.from('messages').insert({ name, email, phone, subject, message });
      if (error) {
        if ((error.code === '42703' || error.code === 'PGRST204') && /\b(phone|subject)\b/i.test(error.message)) {
          throw new Error('The contact form database migration has not been applied yet. Please try again later.');
        }
        throw new Error(`Your message could not be saved: ${error.message}`);
      }

      const warnings: string[] = [];
      const recipientEmail = contactSettings.email.value.trim() || SITE.email.trim();
      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && recipientEmail) {
        let emailjsModule: typeof import('@emailjs/browser') | undefined;
        try {
          emailjsModule = await import('@emailjs/browser');
          await emailjsModule.default.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              from_name: name,
              from_email: email,
              reply_to: email,
              phone,
              subject,
              message,
              to_name: SITE.name,
              to_email: recipientEmail,
            },
            { publicKey: EMAILJS_PUBLIC_KEY },
          );
        } catch (emailError) {
          console.error('Contact message was saved to Supabase, but the EmailJS notification failed.', emailError);
          const providerMessage = emailjsModule && emailError instanceof emailjsModule.EmailJSResponseStatus
            ? emailError.text.toLowerCase()
            : '';
          warnings.push(providerMessage.includes('template id not found')
            ? 'The message is saved, but EmailJS could not find the configured template.'
            : 'The message is saved, but its email notification could not be sent.');
        }
      } else {
        warnings.push('The message is saved, but EmailJS notifications are not configured.');
      }

      if (import.meta.env.VITE_FIREBASE_API_KEY) {
        try {
          const [{ db }, firestore] = await Promise.all([
            import('../lib/firebase'),
            import('firebase/firestore'),
          ]);
          if (db) {
            await firestore.addDoc(firestore.collection(db, 'messages'), {
              name,
              email,
              phone,
              subject,
              message,
              status: 'unread',
              createdAt: firestore.serverTimestamp(),
            });
          } else {
            warnings.push('The legacy Firebase archive is not configured.');
          }
        } catch (archiveError) {
          console.error('Contact message was saved to Supabase but could not be copied to the legacy Firebase archive.', archiveError);
          warnings.push('The Supabase inbox has the message, but the legacy Firebase archive did not update.');
        }
      } else {
        warnings.push('The legacy Firebase archive is not configured.');
      }

      setFormData({ name: '', email: '', phone: '', subject: '', message: '', website: '' });
      setNotice({
        type: 'success',
        message: `Your message was saved successfully. Thank you for getting in touch.${warnings.length ? ` ${warnings.join(' ')}` : ''}`,
      });
    } catch (error) {
      console.error('Supabase contact message submission failed.', error);
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'We could not save your message. Please try again.',
      });
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const whatsappDigits = contactSettings.whatsapp.value.replace(/\D/g, '');
  const allContactItems: ContactItem[] = [
    {
      key: 'phone',
      label: 'Phone',
      value: contactSettings.phone.value,
      enabled: contactSettings.phone.enabled && contactSettings.phone.published,
      href: `tel:${contactSettings.phone.value.replace(/[^\d+]/g, '')}`,
      icon: Phone,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: contactSettings.whatsapp.value,
      enabled: contactSettings.whatsapp.enabled && contactSettings.whatsapp.published && Boolean(whatsappDigits),
      href: `https://wa.me/${whatsappDigits}`,
      icon: Phone,
      iconOnlyIcon: MessageCircle,
    },
    {
      key: 'email',
      label: 'Email',
      value: contactSettings.email.value,
      enabled: contactSettings.email.enabled && contactSettings.email.published,
      href: `mailto:${contactSettings.email.value}`,
      icon: Mail,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      value: contactSettings.linkedin.value,
      enabled: contactSettings.linkedin.enabled && contactSettings.linkedin.published,
      href: contactSettings.linkedin.value,
      icon: Linkedin,
    },
    {
      key: 'github',
      label: 'GitHub',
      value: contactSettings.github.value,
      enabled: contactSettings.github.enabled && contactSettings.github.published,
      href: contactSettings.github.value,
      icon: Github,
    },
    {
      key: 'location',
      label: 'Location',
      value: contactSettings.location.value,
      enabled: contactSettings.location.enabled && contactSettings.location.published,
      href: '',
      icon: MapPin,
      iconOnlyHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactSettings.location.value.trim())}`,
    },
  ];
  const contactItems = allContactItems.filter((item) => item.enabled && item.value.trim());

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative w-full overflow-hidden border-t border-white/5 px-5 py-24 text-gray-100 sm:px-8 md:px-16 md:py-28 lg:px-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(127,29,29,0.12),transparent_58%)]" aria-hidden="true" />
      <div ref={titleRef} className="relative z-10 mx-auto mb-12 max-w-3xl text-center md:mb-14">
        <span className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-red-300 sm:text-sm">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Contact
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-5xl md:text-7xl">
          {contactSettings.heading}
        </h2>
        <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[#a31515]" />
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
          {contactSettings.description}
        </p>
      </div>

      <div ref={cardRef} className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div
          key={contactSettings.iconOnly ? 'icon-only' : 'full-contact'}
          className={`contact-mode-enter grid content-start gap-3 ${
            contactSettings.iconOnly
              ? 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-2'
              : 'sm:grid-cols-2 lg:grid-cols-1'
          }`}
        >
          {contactItems.map((item) => {
            const Icon = contactSettings.iconOnly ? (item.iconOnlyIcon ?? item.icon) : item.icon;
            if (contactSettings.iconOnly) {
              const href = item.iconOnlyHref ?? item.href;
              const external = ['whatsapp', 'linkedin', 'github', 'location'].includes(item.key);
              return (
                <a
                  key={item.key}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  aria-label={item.label}
                  className="glass glass-hover group grid aspect-square min-h-20 place-items-center rounded-2xl p-4 text-red-300 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-red-400/25 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
                >
                  <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-active:scale-95" aria-hidden="true" />
                </a>
              );
            }
            const card = (
              <>
                <span className="glass-chip grid h-11 w-11 shrink-0 place-items-center rounded-xl text-red-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{item.label}</span>
                  <span className="mt-1 block break-all text-sm font-bold text-gray-100 sm:text-base">{item.value}</span>
                </span>
                {item.href && <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-red-300" aria-hidden="true" />}
              </>
            );
            return item.href ? (
              <a
                key={item.key}
                href={item.href}
                target={['linkedin', 'github', 'whatsapp'].includes(item.key) ? '_blank' : undefined}
                rel={['linkedin', 'github', 'whatsapp'].includes(item.key) ? 'noreferrer' : undefined}
                className="glass glass-hover group flex min-h-20 items-center gap-4 rounded-2xl p-4 transition duration-300 hover:-translate-y-1 hover:border-red-400/25"
              >
                {card}
              </a>
            ) : (
              <div key={item.key} className="glass glass-hover flex min-h-20 items-center gap-4 rounded-2xl p-4">
                {card}
              </div>
            );
          })}
          {!contactItems.length && !contactSettings.iconOnly && (
            <p className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm text-gray-400">
              Contact methods are not currently published. You can still send a message using the form.
            </p>
          )}
        </div>

        <div className="red-halo" style={{ inset: '-8% -4%' }} aria-hidden="true" />
        <div className="glass glass-panel-card relative rounded-3xl p-5 sm:p-8 md:p-10">
          {notice && (
            <div
              role={notice.type === 'error' ? 'alert' : 'status'}
              aria-live={notice.type === 'error' ? 'assertive' : 'polite'}
              className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
                notice.type === 'success'
                  ? 'border-emerald-400/30 bg-emerald-950/30 text-emerald-100'
                  : 'border-red-400/30 bg-red-950/30 text-red-100'
              }`}
            >
              {notice.type === 'success'
                ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
              <p>{notice.message}</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-black text-white">Send a message</h3>
            <p className="mt-2 text-sm text-gray-500">Share a project, opportunity, or question.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="contact-website">Leave this field empty</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={formData.website}
                onChange={(event) => updateField('website', event.target.value)}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <ContactInput id="contact-name" label="Full name" autoComplete="name" maxLength={120} required value={formData.name} disabled={isSending} onChange={(value) => updateField('name', value)} />
              <ContactInput id="contact-email" label="Email address" type="email" autoComplete="email" maxLength={254} required value={formData.email} disabled={isSending} onChange={(value) => updateField('email', value)} />
              <ContactInput id="contact-phone" label="Phone number (optional)" type="tel" autoComplete="tel" maxLength={40} value={formData.phone} disabled={isSending} onChange={(value) => updateField('phone', value)} />
              <ContactInput id="contact-subject" label="Subject" maxLength={180} required value={formData.subject} disabled={isSending} onChange={(value) => updateField('subject', value)} />
            </div>

            <label htmlFor="contact-message" className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              Message
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                maxLength={5000}
                value={formData.message}
                onChange={(event) => updateField('message', event.target.value)}
                placeholder="Tell me a little about what you have in mind..."
                disabled={isSending}
                className="glass-input w-full resize-y rounded-2xl px-4 py-3 text-sm font-medium normal-case tracking-normal text-gray-100 placeholder:text-gray-600 focus:outline-none disabled:cursor-wait disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={isSending}
              aria-busy={isSending}
              className="glass-red inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full px-7 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
            >
              {isSending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

function ContactInput({
  id,
  label,
  type = 'text',
  autoComplete,
  maxLength,
  required = false,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  maxLength: number;
  required?: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
      {label}
      <input
        id={id}
        name={id === 'contact-email' ? 'email' : id.replace('contact-', '')}
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium normal-case tracking-normal text-gray-100 placeholder:text-gray-600 focus:outline-none disabled:cursor-wait disabled:opacity-60"
      />
    </label>
  );
}
