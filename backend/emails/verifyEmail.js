exports.template = ({ link, username }) => `
  <div style="font-family:system-ui,Segoe UI,sans-serif">
    <h2>Verify your email</h2>
    <p>Hi ${username || 'there'}, please verify your email to activate your account.</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a></p>
    <p>Or paste this link into your browser:<br>${link}</p>
    <p>This link expires in 30 minutes.</p>
  </div>
`;
