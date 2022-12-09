import * as postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

export default async function handler(request, response) {
  const body = request.body;

  if (!body.name || !body.email || !body.message) {
    return response.status(400).json({ data: 'Invalid' });
  }

  const subject = `Message from ${body.name} (${body.email}) via jotai.org`;

  const message = `
    Name: ${body.name}\r\n
    Email: ${body.email}\r\n
    Message: ${body.message}
  `;

  try {
    await client.sendEmail({
      From: 'noreply@jotai.org',
      To: process.env.EMAIL_RECIPIENTS,
      Subject: subject,
      ReplyTo: body.email,
      TextBody: message,
    });

    response.status(200).json({ status: 'Sent' });
  } catch (error) {
    response.status(500).json({ status: 'Not sent' });
  }
}
