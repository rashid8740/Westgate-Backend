const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const emailTemplates = {
  contactNotification: (contact) => ({
    subject: `New Contact Form Submission - ${contact.inquiryType.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Westgate Group of Schools</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="border-left: 4px solid #DC2626; padding-left: 20px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 5px 0;">Inquiry Type: ${contact.inquiryType.toUpperCase()}</h2>
            <p style="color: #6b7280; margin: 0;">Submitted: ${new Date(contact.createdAt).toLocaleString()}</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Contact Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937;">${contact.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${contact.email}" style="color: #DC2626; text-decoration: none;">${contact.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Phone:</td>
                <td style="padding: 8px 0;"><a href="tel:${contact.phone}" style="color: #DC2626; text-decoration: none;">${contact.phone}</a></td>
              </tr>
              ${contact.childAge ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Child Age:</td>
                <td style="padding: 8px 0; color: #1f2937;">${contact.childAge}</td>
              </tr>
              ` : ''}
              ${contact.preferredProgram ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Program:</td>
                <td style="padding: 8px 0; color: #1f2937;">${contact.preferredProgram}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Contact Time:</td>
                <td style="padding: 8px 0; color: #1f2937;">${contact.preferredContactTime}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Message</h3>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid #F59E0B;">
              <p style="color: #1f2937; margin: 0; line-height: 1.6;">${contact.message}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="mailto:${contact.email}?subject=Re: Your inquiry to Westgate Group of Schools" 
               style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reply to ${contact.name}
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>This email was sent from the Westgate Group of Schools contact form.</p>
        </div>
      </div>
    `
  }),

  contactConfirmation: (contact) => ({
    subject: 'Thank you for contacting Westgate Group of Schools',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Thank You for Your Inquiry</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Westgate Group of Schools</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">Dear ${contact.name},</p>
          
          <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for your interest in Westgate Group of Schools. We have received your inquiry 
            regarding <strong>${contact.inquiryType}</strong> and appreciate you taking the time to contact us.
          </p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">What happens next?</h3>
            <ul style="color: #166534; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Our admissions team will review your inquiry within 24 hours</li>
              <li style="margin-bottom: 8px;">You'll receive a personalized response via email or phone</li>
              <li style="margin-bottom: 8px;">We'll provide detailed information about our programs and next steps</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Your Inquiry Details</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 6px; overflow: hidden;">
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Inquiry Type:</td>
                <td style="padding: 12px 15px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${contact.inquiryType.charAt(0).toUpperCase() + contact.inquiryType.slice(1)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Submitted:</td>
                <td style="padding: 12px 15px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${new Date(contact.createdAt).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #374151;">Reference ID:</td>
                <td style="padding: 12px 15px; color: #1f2937;">${contact._id.toString().slice(-8).toUpperCase()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">In the meantime...</p>
            <p style="color: #92400e; margin: 10px 0 0 0;">
              Feel free to explore our website to learn more about our programs, facilities, and achievements. 
              You can also follow us on social media for the latest updates.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westgateschool.ac.ke" 
               style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
              Visit Our Website
            </a>
            <a href="https://westgateschool.ac.ke/prospectus.pdf" 
               style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Download Prospectus
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Contact Information</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #374151;"><strong>Phone:</strong> +254 722 000 000</td>
                <td style="padding: 5px 0; color: #374151;"><strong>Email:</strong> info@westgateschool.ac.ke</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 5px 0; color: #374151;"><strong>Address:</strong> Westgate Road, Nairobi, Kenya</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>Westgate Group of Schools - Excellence in Education Since 1995</p>
        </div>
      </div>
    `
  }),

  welcomeNewsletter: (newsletter) => ({
    subject: 'Welcome to the Westgate Family Newsletter!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to Our Newsletter!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Westgate Group of Schools</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">
            ${newsletter.name ? `Dear ${newsletter.name},` : 'Hello!'}
          </p>
          
          <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for subscribing to the Westgate Group of Schools newsletter! We're excited to 
            have you as part of our community and look forward to keeping you updated with our latest 
            news, achievements, and upcoming events.
          </p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin: 0 0 15px 0;">What you can expect:</h3>
            <ul style="color: #166534; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Monthly school newsletters with academic updates</li>
              <li style="margin-bottom: 8px;">Event announcements and invitation</li>
              <li style="margin-bottom: 8px;">Student achievement celebrations</li>
              <li style="margin-bottom: 8px;">Important admissions and enrollment information</li>
              <li style="margin-bottom: 8px;">Behind-the-scenes glimpses of school life</li>
            </ul>
          </div>
          
          ${newsletter.preferences && newsletter.preferences.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Your Preferences</h3>
            <p style="color: #374151; margin: 0 0 10px 0;">You've subscribed to updates about:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${newsletter.preferences.map(pref => `
                <span style="background-color: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
                  ${pref.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westgateschool.ac.ke" 
               style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
              Visit Our Website
            </a>
            <a href="https://westgateschool.ac.ke/about" 
               style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Learn About Us
            </a>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">Stay Connected</p>
            <p style="color: #92400e; margin: 0;">
              Follow us on social media for daily updates and join our community of families 
              who choose excellence in education.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>You can update your preferences or unsubscribe at any time.</p>
          <p>Westgate Group of Schools - Excellence in Education Since 1995</p>
        </div>
      </div>
    `
  })
};

// Send contact notification to admin
const sendContactNotification = async (contact, type = 'general') => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.contactNotification(contact);
    
    const mailOptions = {
      from: `"Westgate School Website" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Contact notification sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send contact notification:', error);
    throw error;
  }
};

// Send contact confirmation to user
const sendContactConfirmation = async (contact, type = 'general') => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.contactConfirmation(contact);
    
    const mailOptions = {
      from: `"Westgate Group of Schools" <${process.env.EMAIL_USER}>`,
      to: contact.email,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Contact confirmation sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send contact confirmation:', error);
    throw error;
  }
};

// Send welcome email for newsletter subscription
const sendWelcomeEmail = async (newsletter) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.welcomeNewsletter(newsletter);
    
    const mailOptions = {
      from: `"Westgate Group of Schools" <${process.env.EMAIL_USER}>`,
      to: newsletter.email,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendContactNotification,
  sendContactConfirmation,
  sendWelcomeEmail,
  testEmailConfig
};
