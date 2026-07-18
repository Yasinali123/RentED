export const baseLayout = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      padding: 35px;
      text-align: center;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      margin-bottom: 12px;
      backdrop-filter: blur(8px);
    }
    .logo-text {
      color: #ffffff;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .header-tag {
      color: rgba(255, 255, 255, 0.85);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.15em;
      margin: 0;
      line-height: 1;
    }
    .content {
      padding: 40px 35px;
      line-height: 1.6;
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #f1f5f9;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 700;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 24px 0;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);
    }
    h2 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }
    p {
      margin-top: 0;
      margin-bottom: 16px;
      color: #334155;
    }
    .card {
      background-color: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid #f1f5f9;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 8px;
    }
    hr {
      border: 0;
      border-top: 1px solid #f1f5f9;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <span class="logo-text">🎓 RentED</span>
        </div>
        <p class="header-tag">Campus Rental Hub</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>This email was sent by <b>RentED</b>, your institutional campus marketplace.</p>
        <p>&copy; ${new Date().getFullYear()} RentED. All rights reserved.</p>
        <p>Need support? Contact us at <a href="mailto:rented4us@gmail.com">rented4us@gmail.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
