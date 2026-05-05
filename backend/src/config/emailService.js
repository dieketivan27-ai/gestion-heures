const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    // Helps with connection issues in some environments
    rejectUnauthorized: false
  }
});

exports.sendWelcomeEmail = async (email, password, nom, prenom) => {
  const loginUrl = process.env.APP_URL || 'http://localhost:4200';

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Bienvenue sur GestionHeures - Vos identifiants de connexion',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">GestionHeures</h1>
        </div>
        <div style="padding: 30px; color: #334155;">
          <h2 style="color: #1e293b;">Bonjour ${prenom} ${nom},</h2>
          <p>Un compte enseignant a été créé pour vous sur la plateforme <strong>GestionHeures</strong>.</p>
          <p>Voici vos identifiants pour votre première connexion :</p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Identifiant (Email)</p>
            <p style="margin: 0 0 20px 0; font-weight: bold; font-size: 18px; color: #0f172a;">${email}</p>
            
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Mot de passe temporaire</p>
            <p style="margin: 0; font-family: monospace; font-weight: bold; font-size: 24px; color: #2563eb; letter-spacing: 2px;">${password}</p>
          </div>
          
          <p style="color: #dc2626; font-size: 14px;"><strong>Note technique :</strong> Vous devrez changer ce mot de passe dès votre première connexion.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Se connecter</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Ceci est un message automatique, merci de ne pas y répondre.
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé: ' + info.response);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

exports.sendResetPasswordEmail = async (email, token, name) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost'}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - GestionHeures',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">GestionHeures</h1>
        </div>
        <div style="padding: 30px; color: #334155;">
          <h2 style="color: #1e293b;">Bonjour ${name},</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte sur <strong>GestionHeures</strong>.</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
               Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;"><strong>Note :</strong> Ce lien est valide pendant 6 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
          <p style="font-size: 12px; color: #94a3b8;">Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :<br>${resetUrl}</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Ceci est un message automatique, merci de ne pas y répondre.
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de réinitialisation envoyé: ' + info.response);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
    return false;
  }
};
