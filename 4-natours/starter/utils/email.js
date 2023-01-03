const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    // Activate in gmail "less secure app" option
    // service: 'Gmail',
    // Here we use mailtrap (custom service)
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  // Define email options
  const mailOptions = {
    from: 'Nep nep <neptulon63@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: ,
  };
  // Send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
