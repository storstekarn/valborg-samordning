const LOGIN_URL = 'https://valborg-samordning-production.up.railway.app/auth/login'
const LOGIN_URL_DISPLAY = 'valborg-samordning-production.up.railway.app/auth/login'

export function buildInviteHtml(name: string | null, _loginUrl: string): string {
  const greeting = name ? `Hej ${name}!` : 'Hej!'
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inbjudan – Valborg Infra 2026</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f59e0b;">
                Valborg Infra 2026
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:36px 36px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f4f4f5;line-height:1.3;">
                ${greeting}
              </p>

              <!-- Body text -->
              <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.65;">
                Du är tilldelad uppgifter på valborgsmässoafton och kan följa körschema,
                rapportera incidenter och kommunicera med driftledningen via appen.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.65;">
                Vi ber om ursäkt – den tidigare inloggningslänken fungerade tyvärr inte
                för alla. Vi har nu bytt till en enklare metod: du loggar in med en
                engångskod som skickas till din e-post.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.65;">
                Tryck på knappen nedan, skriv in din e-postadress och klicka på "Skicka kod"
                – då får du en engångskod via e-post som du skriver in för att logga in.
              </p>

              <!-- Platform instructions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#1c1c1f;border:1px solid #27272a;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;">Öppna länken i din webbläsare</p>
                    <p style="margin:0 0 6px;font-size:13px;color:#a1a1aa;line-height:1.5;">📱 <strong style="color:#d4d4d8;">iPhone:</strong> Tryck länge på knappen → välj "Öppna i Safari"</p>
                    <p style="margin:0 0 6px;font-size:13px;color:#a1a1aa;line-height:1.5;">🤖 <strong style="color:#d4d4d8;">Android:</strong> Tryck länge på knappen → välj "Öppna i Chrome"</p>
                    <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.5;">💻 <strong style="color:#d4d4d8;">Dator:</strong> Klicka på knappen som vanligt</p>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:10px;background:#d97706;">
                    <a href="${LOGIN_URL}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#09090b;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Öppna Valborg Infra 2026
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Manual URL fallback -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:12px 16px;background:#111113;border:1px solid #27272a;border-radius:10px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#52525b;">Kopiera manuellt till din webbläsare:</p>
                    <span style="font-size:12px;color:#a1a1aa;word-break:break-all;font-family:monospace;">${LOGIN_URL_DISPLAY}</span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:1px solid #27272a;"></td>
                </tr>
              </table>

              <!-- Footer note -->
              <p style="margin:0;font-size:12px;color:#52525b;line-height:1.6;">
                Knappen tar dig till inloggningssidan där du begär din engångskod.<br />
                Vid frågor, kontakta Patrik eller Max.
              </p>

            </td>
          </tr>

          <!-- Bottom padding -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#3f3f46;text-align:center;">
                Valborg Infra 2026 &middot; Intern samordningsapp
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
