/**
 * The shared Winchester Fire Department brand shell for transactional email.
 * Values mirror the department site (winchesterfireems.com). Pure HTML builders
 * with no server-only dependencies so templates stay unit-testable.
 */

export const BRAND = {
  red: "#A40104",
  redDark: "#8C1C1C",
  green: "#6A994E",
  ink: "#333333",
  muted: "#6b7280",
  page: "#f4f4f4",
  border: "#e5e7eb",
} as const;

export const FONT_STACK =
  "'Roboto Condensed','Segoe UI',Tahoma,Geneva,Verdana,sans-serif";

export const LOGO_CONTENT_ID = "wfd-logo";
export const LOGO_FILENAME = "wfd-logo.png";
export const LOGO_WIDTH = 96;
export const LOGO_HEIGHT = 96;

export const DEPARTMENT_NAME = "Winchester Fire Department";
export const DEPARTMENT_TAGLINE =
  "Serving Winchester &amp; Clark County, KY &middot; Est. 1848";
export const DEPARTMENT_ADDRESS = "44 N Maple Street, Winchester, KY 40392";
export const DEPARTMENT_PHONE = "(859) 744-1598";
export const DEPARTMENT_PHONE_HREF = "tel:+18597441598";
export const DEPARTMENT_SITE = "winchesterfireems.com";
export const DEPARTMENT_SITE_HREF = "https://winchesterfireems.com";

/** The department-red masthead: logo, wordmark, tagline, and green accent rule. */
export function emailHeader(): string {
  return `
        <tr>
          <td align="center" bgcolor="${BRAND.red}" style="background:${BRAND.red};padding:28px 24px 22px;">
            <img src="cid:${LOGO_CONTENT_ID}" alt="${DEPARTMENT_NAME}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;border:0;outline:none;text-decoration:none;margin:0 auto 12px;" />
            <div style="font-family:${FONT_STACK};color:#ffffff;font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${DEPARTMENT_NAME}</div>
            <div style="font-family:${FONT_STACK};color:#f3d6d7;font-size:13px;font-style:italic;margin-top:6px;">${DEPARTMENT_TAGLINE}</div>
          </td>
        </tr>
        <tr>
          <td bgcolor="${BRAND.green}" style="background:${BRAND.green};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
        </tr>`;
}

/** The department footer: name and contact details. */
export function emailFooter(): string {
  return `
        <tr>
          <td bgcolor="${BRAND.ink}" style="background:${BRAND.ink};padding:20px 28px;text-align:center;">
            <div style="font-family:${FONT_STACK};color:#ffffff;font-size:13px;font-weight:700;">${DEPARTMENT_NAME}</div>
            <div style="font-family:${FONT_STACK};color:#cccccc;font-size:12px;margin-top:6px;">${DEPARTMENT_ADDRESS}</div>
            <div style="font-family:${FONT_STACK};color:#cccccc;font-size:12px;margin-top:6px;">
              <a href="${DEPARTMENT_PHONE_HREF}" style="color:${BRAND.green};text-decoration:none;">${DEPARTMENT_PHONE}</a>
              &nbsp;&middot;&nbsp;
              <a href="${DEPARTMENT_SITE_HREF}" style="color:${BRAND.green};text-decoration:none;">${DEPARTMENT_SITE}</a>
            </div>
          </td>
        </tr>`;
}

/**
 * Wraps a body in the shared shell. The shell is a fixed 600px table so it
 * survives Outlook; rounded corners simply square off there.
 */
export function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${DEPARTMENT_NAME}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};font-family:${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden;">
            ${emailHeader()}
            <tr>
              <td style="padding:32px 32px 8px;font-family:${FONT_STACK};color:${BRAND.ink};">${bodyHtml}</td>
            </tr>
            ${emailFooter()}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
