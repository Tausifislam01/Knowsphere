exports.template = ({ link, username }) => `
  <div style="font-family:system-ui,Segoe UI,sans-serif">
    <h2>Reset your password</h2>
    <p>Hi ${username || 'there'}, click the button below to reset your password.</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p>
    <p>Or paste this link into your browser:<br>${link}</p>
    <p>This link expires in 30 minutes and can be used once.</p>
  </div>
`;
