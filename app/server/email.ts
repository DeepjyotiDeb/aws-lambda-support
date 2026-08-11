import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.CDK_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY!,
    secretAccessKey: process.env.SECRET_KEY!,
  },
});

export async function sendEmail(to: string, subject: string, htmlBody: string) {
  const fromAddress = process.env.SES_FROM_ADDRESS;
  if (!fromAddress) {
    console.warn("SES_FROM_ADDRESS is not set. Simulating email sending.");
    console.log(`To: ${to}\nSubject: ${subject}\nBody: ${htmlBody}`);
    return;
  }
  if (!sesClient) {
    console.log(`To: ${to}\nSubject: ${subject}\nBody: ${htmlBody}`);
    return;
  }

  const command = new SendEmailCommand({
    Source: fromAddress,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: htmlBody } },
    },
  });

  await sesClient.send(command);
}
