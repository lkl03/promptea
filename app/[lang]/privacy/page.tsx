import { hasLocale } from "../dictionaries";
import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { pick, toLang } from "@/lib/domain";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);
  return pageMetadata({
    lang: l,
    path: `/${l}/privacy`,
    title: pick(l, { es: "Política de privacidad", en: "Privacy policy", pt: "Política de privacidade" }),
    description:
      pick(l, {
        es: "Qué recolecta Promptea (metadatos del análisis, no el texto de tus prompts), qué no recolecta, cómo funciona el dictado por voz y el feedback.",
        en: "What Promptea collects (analysis metadata, not your prompt text), what it does not, and how voice dictation and feedback are handled.",
        pt: "O que o Promptea coleta (metadados da análise, não o texto do seu prompt), o que não coleta e como trata o ditado por voz e o feedback.",
      }),
  });
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();


  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <JsonLd data={registryPageGraph(lang, `/${lang}/privacy`, {})} />
      <h1 className="text-2xl font-semibold">{pick(lang, { es: "Política de Privacidad", en: "Privacy Policy", pt: "Política de privacidade" })}</h1>

      <section className="space-y-3 text-sm opacity-90 leading-relaxed">
        <p>
          {pick(lang, {
            es: "Promptea analiza prompts. La telemetría está pensada para ser respetuosa con la privacidad: por defecto no guardamos el texto crudo de tus prompts.",
            en: "Promptea analyzes prompts. Telemetry is designed to be privacy-friendly: by default we do not store your raw prompt text.",
            pt: "O Promptea analisa prompts. A telemetria foi pensada para respeitar a privacidade: por padrão, não guardamos o texto bruto do seu prompt.",
          })}
        </p>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Qué recolectamos", en: "What we collect", pt: "O que coletamos" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>{pick(lang, {
            es: "Identificador de sesión seudónimo.",
            en: "Pseudonymous session identifier.",
            pt: "Identificador de sessão pseudônimo.",
          })}</li>
          <li>
            {pick(lang, {
              es: "Metadatos del análisis: score, confianza, modelo target, idioma, tipo de tarea.",
              en: "Analysis metadata: score, confidence, target model, language, task type.",
              pt: "Metadados da análise: pontuação, confiança, modelo de destino, idioma, tipo de tarefa.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "IDs de findings/recommendations (ej: “missing_context”, “add_goal”).",
              en: "Finding/recommendation IDs (e.g. “missing_context”, “add_goal”).",
              pt: "IDs de achados/recomendações (ex.: “missing_context”, “add_goal”).",
            })}
          </li>
          <li>{pick(lang, {
            es: "Feedback opcional (útil: sí/no).",
            en: "Optional feedback (helpful: yes/no).",
            pt: "Feedback opcional (útil: sim/não).",
          })}</li>
          <li>{pick(lang, {
            es: "Timestamps técnicos para retención/analytics.",
            en: "Technical timestamps for retention/analytics.",
            pt: "Carimbos de data e hora técnicos para retenção/análise.",
          })}</li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Qué NO recolectamos", en: "What we do NOT collect", pt: "O que NÃO coletamos" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "No guardamos el prompt completo en telemetría por defecto.",
              en: "We do not store the full prompt text in telemetry by default.",
              pt: "Por padrão, não guardamos o texto completo do prompt na telemetria.",
            })}
          </li>
          <li>{pick(lang, {
            es: "No vendemos datos personales.",
            en: "We do not sell personal data.",
            pt: "Não vendemos dados pessoais.",
          })}</li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Dictado por voz", en: "Voice dictation", pt: "Ditado por voz" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "La grabación ocurre solo cuando vos la iniciás y podés cancelarla en cualquier momento.",
              en: "Recording happens only when you start it, and you can cancel at any time.",
              pt: "A gravação só acontece quando você a inicia, e você pode cancelar a qualquer momento.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "El audio se envía a nuestro proveedor de transcripción (Groq) únicamente para convertirlo en texto y se descarta después: no guardamos el audio en ningún lado — ni en base de datos, ni en telemetría, ni en logs.",
              en: "Audio is sent to our transcription provider (Groq) solely to convert it into text and is discarded afterwards: we never store audio anywhere — not in our database, telemetry, or logs.",
              pt: "O áudio é enviado ao nosso provedor de transcrição (Groq) apenas para ser convertido em texto e é descartado em seguida: nunca guardamos áudio em lugar nenhum — nem no banco de dados, nem na telemetria, nem nos logs.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "La transcripción se devuelve a tu navegador para que la revises. No se guarda, salvo que vos decidas usarla en un análisis (donde aplican las mismas reglas que a cualquier prompt).",
              en: "The transcript is returned to your browser for review. It is not stored unless you choose to use it in an analysis (where the same rules as any prompt apply).",
              pt: "A transcrição volta para o seu navegador para revisão. Ela não é guardada, a menos que você decida usá-la em uma análise (caso em que valem as mesmas regras de qualquer prompt).",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "En telemetría solo registramos eventos operativos tipificados (grabación iniciada, transcripción exitosa o motivo de error), nunca el contenido.",
              en: "Telemetry records only typed operational events (recording started, transcription succeeded, or a failure reason), never the content.",
              pt: "A telemetria registra apenas eventos operacionais tipados (gravação iniciada, transcrição concluída ou o motivo de uma falha), nunca o conteúdo.",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Feedback general de la app", en: "General app feedback", pt: "Feedback geral sobre o app" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "Si enviás feedback desde el botón “Feedback”, guardamos tu mensaje junto con: categoría opcional, idioma, página/modo, versión de la app, tema visual y un hash anónimo de sesión.",
              en: "If you send feedback via the “Feedback” button, we store your message together with: optional category, language, page/mode, app version, visual theme, and an anonymous session hash.",
              pt: "Se você envia feedback pelo botão “Feedback”, guardamos sua mensagem junto com: categoria opcional, idioma, página/modo, versão do app, tema visual e um hash anônimo de sessão.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "No guardamos tu prompt junto con el feedback, ni pedimos email ni datos de contacto.",
              en: "We do not store your prompt with the feedback, and we do not ask for email or contact details.",
              pt: "Não guardamos seu prompt junto com o feedback e não pedimos e-mail nem dados de contato.",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, {
          es: "Newsletter (Promptea Semanal)",
          en: "Newsletter (Promptea Weekly)",
          pt: "Newsletter (Promptea Weekly)",
        })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "Si te suscribís al newsletter, guardamos tu dirección de email, tu preferencia de idioma y la fecha de suscripción.",
              en: "If you subscribe to the newsletter, we store your email address, language preference, and subscription date.",
              pt: "Se você assina a newsletter, guardamos seu endereço de e-mail, o idioma escolhido e a data da inscrição.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Tu email se usa exclusivamente para enviarte el newsletter semanal. No lo compartimos con terceros ni lo usamos para otros fines.",
              en: "Your email is used exclusively to send you the weekly newsletter. We do not share it with third parties or use it for other purposes.",
              pt: "Seu e-mail é usado exclusivamente para enviar a newsletter semanal. Não o compartilhamos com terceiros nem o usamos para outros fins.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Tu email nunca aparece en logs del servidor, en telemetría ni en analytics. Internamente almacenamos un hash criptográfico para detectar duplicados.",
              en: "Your email never appears in server logs, telemetry, or analytics. Internally we store a cryptographic hash for duplicate detection.",
              pt: "Seu e-mail nunca aparece em logs do servidor, telemetria ou analytics. Internamente guardamos um hash criptográfico para detectar duplicatas.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Podés desuscribirte en cualquier momento usando el enlace incluido en cada edición del newsletter.",
              en: "You can unsubscribe at any time using the link included in every newsletter edition.",
              pt: "Você pode cancelar a inscrição a qualquer momento pelo link incluído em todas as edições da newsletter.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "El envío se realiza a través de Resend, nuestro proveedor de email. Consultá su política de privacidad en resend.com/legal/privacy-policy.",
              en: "Delivery is handled by Resend, our email provider. See their privacy policy at resend.com/legal/privacy-policy.",
              pt: "O envio é feito pela Resend, nosso provedor de e-mail. Veja a política de privacidade deles em resend.com/legal/privacy-policy.",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, {
          es: "Feed de X (contenido de terceros)",
          en: "X feed (third-party content)",
          pt: "Feed do X (conteúdo de terceiros)",
        })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "La página de inicio y la de IA al Día muestran las publicaciones de Promptea en X (Twitter) con un widget de Elfsight. Es contenido de terceros: lo carga y lo sirve Elfsight desde elfsightcdn.com y sus servidores, y las publicaciones, imágenes y avatares son de X.",
              en: "The home page and AI Daily show Promptea's posts on X (Twitter) through an Elfsight widget. It is third-party content: Elfsight loads and serves it from elfsightcdn.com and its own servers, and the posts, images and avatars come from X.",
              pt: "A página inicial e o AI Daily mostram as publicações do Promptea no X (Twitter) por meio de um widget da Elfsight. É conteúdo de terceiros: a Elfsight o carrega e o serve a partir de elfsightcdn.com e de seus próprios servidores, e as publicações, imagens e avatares vêm do X.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Se carga solo cuando la tarjeta del feed está por entrar en pantalla; en una página donde no aparece esa tarjeta no se hace ningún pedido a Elfsight.",
              en: "It loads only when the feed card is about to come on screen; a page that does not show that card makes no request to Elfsight.",
              pt: "Ele só é carregado quando o cartão do feed está prestes a aparecer na tela; uma página que não mostra esse cartão não faz nenhuma requisição à Elfsight.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Al cargarse, Elfsight (y X, por las imágenes) pueden recibir tu dirección IP y datos de tu navegador, y pueden usar cookies o almacenamiento propio, según sus políticas de privacidad (elfsight.com/privacy-policy, x.com/privacy). Promptea no recibe esos datos.",
              en: "When it loads, Elfsight (and X, for the images) may receive your IP address and browser data and may use their own cookies or storage, as described in their privacy policies (elfsight.com/privacy-policy, x.com/privacy). Promptea does not receive that data.",
              pt: "Ao carregar, a Elfsight (e o X, pelas imagens) pode receber seu endereço IP e dados do seu navegador e pode usar cookies ou armazenamento próprios, conforme suas políticas de privacidade (elfsight.com/privacy-policy, x.com/privacy). O Promptea não recebe esses dados.",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Almacenamiento en tu navegador", en: "Storage in your browser", pt: "Armazenamento no seu navegador" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "Guardamos en tu navegador (localStorage), sin enviarlo a ningún servidor: el tema visual elegido, si cerraste los avisos del newsletter (para no volver a mostrártelos por unos días) y si ya te suscribiste.",
              en: "We keep in your browser (localStorage), without sending it to any server: your chosen visual theme, whether you dismissed the newsletter prompts (so they are not shown again for a few days) and whether you already subscribed.",
              pt: "Guardamos no seu navegador (localStorage), sem enviar a nenhum servidor: o tema visual escolhido, se você fechou os avisos da newsletter (para não mostrá-los de novo por alguns dias) e se você já assinou.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "La Biblioteca de prompts guarda tus análisis recientes (el prompt original y el optimizado, el puntaje y la fecha) únicamente en tu navegador. Esos prompts no salen de tu dispositivo por el hecho de estar en la Biblioteca, no tenemos acceso a ellos y no se sincronizan. Podés borrarlos uno por uno o todos juntos desde la Biblioteca, o limpiando los datos del sitio en tu navegador.",
              en: "The Prompt Library keeps your recent analyses (the original and optimized prompt, the score and the date) only in your browser. Those prompts do not leave your device because they are in the Library, we have no access to them and they are not synced. You can delete them one by one or all at once from the Library, or by clearing the site data in your browser.",
              pt: "A Biblioteca de prompts guarda suas análises recentes (o prompt original e o otimizado, a pontuação e a data) somente no seu navegador. Esses prompts não saem do seu dispositivo por estarem na Biblioteca, não temos acesso a eles e eles não são sincronizados. Você pode excluí-los um a um ou todos de uma vez pela Biblioteca, ou limpando os dados do site no navegador.",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Las tarjetas compartibles del resultado codifican en la URL solo el puntaje y su desglose, nunca el texto del prompt.",
              en: "Shareable result cards encode only the score and its breakdown in the URL, never the prompt text.",
              pt: "Os cartões de resultado para compartilhar codificam na URL apenas a pontuação e o detalhamento, nunca o texto do prompt.",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Retención", en: "Retention", pt: "Retenção" })}</h2>
        <p>
          {pick(lang, {
            es: "La telemetría se retiene por tiempo limitado con una política TTL (time-to-live) y luego se elimina automáticamente. El feedback general se conserva mientras sea útil para mejorar el producto. Los datos de suscripción al newsletter se conservan mientras tu suscripción esté activa; al desuscribirte, tu email se marca como inactivo.",
            en: "Telemetry is retained for a limited time using a TTL (time-to-live) policy and then removed automatically. General feedback is kept for as long as it is useful for improving the product. Newsletter subscription data is kept while your subscription is active; upon unsubscribing, your email is marked inactive.",
            pt: "A telemetria é mantida por tempo limitado, com uma política de TTL (time-to-live), e depois removida automaticamente. O feedback geral é mantido enquanto for útil para melhorar o produto. Os dados de inscrição na newsletter são mantidos enquanto a inscrição estiver ativa; ao cancelar, seu e-mail é marcado como inativo.",
          })}
        </p>
      </section>
    </main>
  );
}
