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
    title: pick(l, { es: "Política de privacidad", en: "Privacy policy", pt: "Política de privacidade", zh: "隐私政策" }),
    description:
      pick(l, {
        es: "Qué recolecta Promptea (metadatos del análisis, no el texto de tus prompts), qué no recolecta, cómo funciona el dictado por voz y el feedback.",
        en: "What Promptea collects (analysis metadata, not your prompt text), what it does not, and how voice dictation and feedback are handled.",
        pt: "O que o Promptea coleta (metadados da análise, não o texto do seu prompt), o que não coleta e como trata o ditado por voz e o feedback.",
        zh: "Promptea收集哪些数据（分析元数据，而非您的提示词文本）、不收集哪些数据，以及如何处理语音输入和反馈。",
      }),
  });
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();


  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <JsonLd data={registryPageGraph(lang, `/${lang}/privacy`, {})} />
      <h1 className="text-2xl font-semibold">{pick(lang, { es: "Política de Privacidad", en: "Privacy Policy", pt: "Política de privacidade", zh: "隐私政策" })}</h1>

      <section className="space-y-3 text-sm opacity-90 leading-relaxed">
        <p>
          {pick(lang, {
            es: "Promptea analiza prompts. La telemetría está pensada para ser respetuosa con la privacidad: por defecto no guardamos el texto crudo de tus prompts.",
            en: "Promptea analyzes prompts. Telemetry is designed to be privacy-friendly: by default we do not store your raw prompt text.",
            pt: "O Promptea analisa prompts. A telemetria foi pensada para respeitar a privacidade: por padrão, não guardamos o texto bruto do seu prompt.",
            zh: "Promptea用于分析提示词。我们的遥测以保护隐私为设计原则：默认情况下，我们不会存储您的提示词原文。",
          })}
        </p>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Qué recolectamos", en: "What we collect", pt: "O que coletamos", zh: "我们收集的数据" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>{pick(lang, {
            es: "Identificador de sesión seudónimo.",
            en: "Pseudonymous session identifier.",
            pt: "Identificador de sessão pseudônimo.",
            zh: "假名化的会话标识符。",
          })}</li>
          <li>
            {pick(lang, {
              es: "Metadatos del análisis: score, confianza, modelo target, idioma, tipo de tarea.",
              en: "Analysis metadata: score, confidence, target model, language, task type.",
              pt: "Metadados da análise: pontuação, confiança, modelo de destino, idioma, tipo de tarefa.",
              zh: "分析元数据：评分、置信度、目标模型、语言、任务类型。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "IDs de findings/recommendations (ej: “missing_context”, “add_goal”).",
              en: "Finding/recommendation IDs (e.g. “missing_context”, “add_goal”).",
              pt: "IDs de achados/recomendações (ex.: “missing_context”, “add_goal”).",
              zh: "问题和建议的ID（例如“missing_context”“add_goal”）。",
            })}
          </li>
          <li>{pick(lang, {
            es: "Feedback opcional (útil: sí/no).",
            en: "Optional feedback (helpful: yes/no).",
            pt: "Feedback opcional (útil: sim/não).",
            zh: "可选的反馈（是否有帮助：是/否）。",
          })}</li>
          <li>{pick(lang, {
            es: "Timestamps técnicos para retención/analytics.",
            en: "Technical timestamps for retention/analytics.",
            pt: "Carimbos de data e hora técnicos para retenção/análise.",
            zh: "用于数据保留和统计分析的技术时间戳。",
          })}</li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Qué NO recolectamos", en: "What we do NOT collect", pt: "O que NÃO coletamos", zh: "我们不收集的数据" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "No guardamos el prompt completo en telemetría por defecto.",
              en: "We do not store the full prompt text in telemetry by default.",
              pt: "Por padrão, não guardamos o texto completo do prompt na telemetria.",
              zh: "默认情况下，我们不会在遥测中存储完整的提示词文本。",
            })}
          </li>
          <li>{pick(lang, {
            es: "No vendemos datos personales.",
            en: "We do not sell personal data.",
            pt: "Não vendemos dados pessoais.",
            zh: "我们不出售个人数据。",
          })}</li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Dictado por voz", en: "Voice dictation", pt: "Ditado por voz", zh: "语音输入" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "La grabación ocurre solo cuando vos la iniciás y podés cancelarla en cualquier momento.",
              en: "Recording happens only when you start it, and you can cancel at any time.",
              pt: "A gravação só acontece quando você a inicia, e você pode cancelar a qualquer momento.",
              zh: "只有在您主动开始时才会录音，您可以随时取消。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "El audio se envía a nuestro proveedor de transcripción (Groq) únicamente para convertirlo en texto y se descarta después: no guardamos el audio en ningún lado — ni en base de datos, ni en telemetría, ni en logs.",
              en: "Audio is sent to our transcription provider (Groq) solely to convert it into text and is discarded afterwards: we never store audio anywhere — not in our database, telemetry, or logs.",
              pt: "O áudio é enviado ao nosso provedor de transcrição (Groq) apenas para ser convertido em texto e é descartado em seguida: nunca guardamos áudio em lugar nenhum — nem no banco de dados, nem na telemetria, nem nos logs.",
              zh: "音频仅为转换成文字而发送给我们的转写服务提供商（Groq），之后即被丢弃：我们不会在任何地方存储音频，无论是数据库、遥测还是日志。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "La transcripción se devuelve a tu navegador para que la revises. No se guarda, salvo que vos decidas usarla en un análisis (donde aplican las mismas reglas que a cualquier prompt).",
              en: "The transcript is returned to your browser for review. It is not stored unless you choose to use it in an analysis (where the same rules as any prompt apply).",
              pt: "A transcrição volta para o seu navegador para revisão. Ela não é guardada, a menos que você decida usá-la em uma análise (caso em que valem as mesmas regras de qualquer prompt).",
              zh: "转写结果会返回到您的浏览器供您检查。除非您选择将其用于分析（此时适用与任何提示词相同的规则），否则不会被存储。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "En telemetría solo registramos eventos operativos tipificados (grabación iniciada, transcripción exitosa o motivo de error), nunca el contenido.",
              en: "Telemetry records only typed operational events (recording started, transcription succeeded, or a failure reason), never the content.",
              pt: "A telemetria registra apenas eventos operacionais tipados (gravação iniciada, transcrição concluída ou o motivo de uma falha), nunca o conteúdo.",
              zh: "遥测只记录预先定义类型的操作事件（开始录音、转写成功或失败原因），从不记录内容。",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Feedback general de la app", en: "General app feedback", pt: "Feedback geral sobre o app", zh: "应用的一般反馈" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "Si enviás feedback desde el botón “Feedback”, guardamos tu mensaje junto con: categoría opcional, idioma, página/modo, versión de la app, tema visual y un hash anónimo de sesión.",
              en: "If you send feedback via the “Feedback” button, we store your message together with: optional category, language, page/mode, app version, visual theme, and an anonymous session hash.",
              pt: "Se você envia feedback pelo botão “Feedback”, guardamos sua mensagem junto com: categoria opcional, idioma, página/modo, versão do app, tema visual e um hash anônimo de sessão.",
              zh: "如果您通过“反馈”按钮发送反馈，我们会存储您的留言以及：可选的类别、语言、页面/模式、应用版本、视觉主题和一个匿名的会话哈希值。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "No guardamos tu prompt junto con el feedback, ni pedimos email ni datos de contacto.",
              en: "We do not store your prompt with the feedback, and we do not ask for email or contact details.",
              pt: "Não guardamos seu prompt junto com o feedback e não pedimos e-mail nem dados de contato.",
              zh: "我们不会把您的提示词与反馈一起存储，也不会要求您提供邮箱或其他联系方式。",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, {
          es: "Newsletter (Promptea Semanal)",
          en: "Newsletter (Promptea Weekly)",
          pt: "Newsletter (Promptea Weekly)",
          zh: "邮件通讯（Promptea Weekly）",
        })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "Si te suscribís al newsletter, guardamos tu dirección de email, tu preferencia de idioma y la fecha de suscripción.",
              en: "If you subscribe to the newsletter, we store your email address, language preference, and subscription date.",
              pt: "Se você assina a newsletter, guardamos seu endereço de e-mail, o idioma escolhido e a data da inscrição.",
              zh: "如果您订阅邮件通讯，我们会存储您的邮箱地址、语言偏好和订阅日期。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Tu email se usa exclusivamente para enviarte el newsletter semanal. No lo compartimos con terceros ni lo usamos para otros fines.",
              en: "Your email is used exclusively to send you the weekly newsletter. We do not share it with third parties or use it for other purposes.",
              pt: "Seu e-mail é usado exclusivamente para enviar a newsletter semanal. Não o compartilhamos com terceiros nem o usamos para outros fins.",
              zh: "您的邮箱仅用于向您发送每周邮件通讯。我们不会与第三方共享，也不会将其用于其他用途。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Tu email nunca aparece en logs del servidor, en telemetría ni en analytics. Internamente almacenamos un hash criptográfico para detectar duplicados.",
              en: "Your email never appears in server logs, telemetry, or analytics. Internally we store a cryptographic hash for duplicate detection.",
              pt: "Seu e-mail nunca aparece em logs do servidor, telemetria ou analytics. Internamente guardamos um hash criptográfico para detectar duplicatas.",
              zh: "您的邮箱绝不会出现在服务器日志、遥测或统计分析中。我们在内部存储一个加密哈希值，用于检测重复订阅。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Podés desuscribirte en cualquier momento usando el enlace incluido en cada edición del newsletter.",
              en: "You can unsubscribe at any time using the link included in every newsletter edition.",
              pt: "Você pode cancelar a inscrição a qualquer momento pelo link incluído em todas as edições da newsletter.",
              zh: "您可以随时通过每期邮件通讯中附带的链接退订。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "El envío se realiza a través de Resend, nuestro proveedor de email. Consultá su política de privacidad en resend.com/legal/privacy-policy.",
              en: "Delivery is handled by Resend, our email provider. See their privacy policy at resend.com/legal/privacy-policy.",
              pt: "O envio é feito pela Resend, nosso provedor de e-mail. Veja a política de privacidade deles em resend.com/legal/privacy-policy.",
              zh: "邮件由我们的邮件服务提供商Resend发送。其隐私政策请见resend.com/legal/privacy-policy。",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, {
          es: "Publicaciones de X",
          en: "Posts from X",
          pt: "Publicações do X",
          zh: "来自X的帖子",
        })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "La página de inicio y la de IA al Día muestran las últimas publicaciones de la cuenta de Promptea en X (Twitter). Desde la versión 1.8.7 las muestra Promptea mismo, como texto: nuestro servidor las obtiene de Buffer, la herramienta con la que las publicamos (o, si no está disponible, de la información pública de X sobre cada publicación), las guarda unas horas en caché y las incluye en la página.",
              en: "The home page and AI Daily show the latest posts of Promptea's X (Twitter) account. Since version 1.8.7 Promptea shows them itself, as text: our server gets them from Buffer, the tool we publish them with (or, when it is unavailable, from X's public information about each post), keeps them in a cache for a few hours and includes them in the page.",
              pt: "A página inicial e o AI Daily mostram as últimas publicações da conta do Promptea no X (Twitter). Desde a versão 1.8.7 o próprio Promptea as exibe, como texto: nosso servidor as obtém do Buffer, a ferramenta com que publicamos (ou, quando ele não está disponível, das informações públicas do X sobre cada publicação), guarda em cache por algumas horas e as inclui na página.",
              zh: "首页和AI Daily会显示Promptea的X（Twitter）账号的最新帖子。自1.8.7版本起，这些帖子由Promptea自己以文本形式显示：我们的服务器从Buffer（我们用来发布帖子的工具）获取帖子（Buffer不可用时，则从X公开的每条帖子信息中获取），在缓存中保留几个小时，然后放入页面。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Tu navegador no carga ningún script, imagen ni widget de X ni de otro tercero para mostrarlas, y no se envía ningún dato tuyo a X ni a Buffer. Solo te conectás con X si abrís un enlace de una publicación o del perfil; desde ahí rige la política de privacidad de X (x.com/privacy).",
              en: "Your browser loads no script, image or widget from X or any other third party to show them, and none of your data is sent to X or Buffer. You only connect to X if you open the link of a post or of the profile; from there X's privacy policy applies (x.com/privacy).",
              pt: "Seu navegador não carrega nenhum script, imagem ou widget do X nem de outro terceiro para exibi-las, e nenhum dado seu é enviado ao X ou ao Buffer. Você só se conecta ao X se abrir o link de uma publicação ou do perfil; a partir daí vale a política de privacidade do X (x.com/privacy).",
              zh: "为了显示这些帖子，您的浏览器不会加载任何来自X或其他第三方的脚本、图片或小组件，您的任何数据也不会发送给X或Buffer。只有当您打开某条帖子或账号主页的链接时，才会连接到X；此后适用X的隐私政策（x.com/privacy）。",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Almacenamiento en tu navegador", en: "Storage in your browser", pt: "Armazenamento no seu navegador", zh: "浏览器中的本地存储" })}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {pick(lang, {
              es: "Guardamos en tu navegador (localStorage), sin enviarlo a ningún servidor: el tema visual elegido, si cerraste los avisos del newsletter (para no volver a mostrártelos por unos días) y si ya te suscribiste.",
              en: "We keep in your browser (localStorage), without sending it to any server: your chosen visual theme, whether you dismissed the newsletter prompts (so they are not shown again for a few days) and whether you already subscribed.",
              pt: "Guardamos no seu navegador (localStorage), sem enviar a nenhum servidor: o tema visual escolhido, se você fechou os avisos da newsletter (para não mostrá-los de novo por alguns dias) e se você já assinou.",
              zh: "我们会在您的浏览器中（localStorage）保存以下内容，且不会发送到任何服务器：您选择的视觉主题、您是否关闭了邮件通讯的订阅提示（以便几天内不再显示），以及您是否已经订阅。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "La Biblioteca de prompts guarda tus análisis recientes (el prompt original y el optimizado, el puntaje y la fecha) únicamente en tu navegador. Esos prompts no salen de tu dispositivo por el hecho de estar en la Biblioteca, no tenemos acceso a ellos y no se sincronizan. Podés borrarlos uno por uno o todos juntos desde la Biblioteca, o limpiando los datos del sitio en tu navegador.",
              en: "The Prompt Library keeps your recent analyses (the original and optimized prompt, the score and the date) only in your browser. Those prompts do not leave your device because they are in the Library, we have no access to them and they are not synced. You can delete them one by one or all at once from the Library, or by clearing the site data in your browser.",
              pt: "A Biblioteca de prompts guarda suas análises recentes (o prompt original e o otimizado, a pontuação e a data) somente no seu navegador. Esses prompts não saem do seu dispositivo por estarem na Biblioteca, não temos acesso a eles e eles não são sincronizados. Você pode excluí-los um a um ou todos de uma vez pela Biblioteca, ou limpando os dados do site no navegador.",
              zh: "提示词库只在您的浏览器中保存您最近的分析（原始提示词、优化后的提示词、评分和日期）。这些提示词不会因为存放在提示词库中而离开您的设备，我们无法访问它们，它们也不会被同步。您可以在提示词库中逐条删除或一次性全部删除，也可以清除浏览器中的网站数据。",
            })}
          </li>
          <li>
            {pick(lang, {
              es: "Las tarjetas compartibles del resultado codifican en la URL solo el puntaje y su desglose, nunca el texto del prompt.",
              en: "Shareable result cards encode only the score and its breakdown in the URL, never the prompt text.",
              pt: "Os cartões de resultado para compartilhar codificam na URL apenas a pontuação e o detalhamento, nunca o texto do prompt.",
              zh: "可分享的结果卡片只会在URL中编码评分及其明细，绝不包含提示词文本。",
            })}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{pick(lang, { es: "Retención", en: "Retention", pt: "Retenção", zh: "数据保留" })}</h2>
        <p>
          {pick(lang, {
            es: "La telemetría se retiene por tiempo limitado con una política TTL (time-to-live) y luego se elimina automáticamente. El feedback general se conserva mientras sea útil para mejorar el producto. Los datos de suscripción al newsletter se conservan mientras tu suscripción esté activa; al desuscribirte, tu email se marca como inactivo.",
            en: "Telemetry is retained for a limited time using a TTL (time-to-live) policy and then removed automatically. General feedback is kept for as long as it is useful for improving the product. Newsletter subscription data is kept while your subscription is active; upon unsubscribing, your email is marked inactive.",
            pt: "A telemetria é mantida por tempo limitado, com uma política de TTL (time-to-live), e depois removida automaticamente. O feedback geral é mantido enquanto for útil para melhorar o produto. Os dados de inscrição na newsletter são mantidos enquanto a inscrição estiver ativa; ao cancelar, seu e-mail é marcado como inativo.",
            zh: "遥测数据按TTL（time-to-live，生存时间）策略保留有限的时间，之后自动删除。一般反馈在对改进产品有帮助期间予以保留。邮件通讯的订阅数据在您的订阅有效期间保留；您退订后，您的邮箱会被标记为未激活。",
          })}
        </p>
      </section>
    </main>
  );
}
