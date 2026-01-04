const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

// Create a transporter object using your email service's SMTP settings
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use 'gmail' or your specific SMTP host
  auth: {
    user: process.env.EMAIL_USER, // Your email address from .env
    pass: process.env.EMAIL_PASS, // Your app password from .env
  },
});

// Function to send an email
exports.sendMail = async (toEmail, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: toEmail, // Recipient address
    subject: subject, // Subject line
    text: text, // Plain text body
    html: html, // HTML body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Re-throw to handle in the controller
  }
};
