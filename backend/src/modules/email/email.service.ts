import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private from: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
    this.from = process.env.EMAIL_FROM || 'FTJJ <noreply@ftjj.tn>';
  }

  async sendWelcomeEmail(to: string, temporaryPassword: string, clubName: string) {
    const subject = 'Bienvenue sur la plateforme FTJJ - Votre compte a été approuvé';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Fédération Tunisienne de Jiu-Jitsu</h1>
        <h2>Bienvenue ${clubName} !</h2>
        <p>Votre inscription a été <strong>approuvée</strong> par l'administration.</p>
        <p>Vous pouvez maintenant vous connecter à votre espace club avec les identifiants suivants :</p>
        <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Email :</strong> ${to}</p>
          <p><strong>Mot de passe temporaire :</strong> ${temporaryPassword}</p>
        </div>
        <p style="color: #e53e3e;"><strong>Important :</strong> Veuillez changer votre mot de passe dès votre première connexion.</p>
        <p>Cordialement,<br/>L'équipe FTJJ</p>
      </div>
    `;

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (error) {
      console.error("Échec d'envoi de l'email de bienvenue:", error.message);
    }
  }

  async sendRejectionEmail(to: string, reason: string) {
    const subject = 'FTJJ - Votre demande d\'inscription a été refusée';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Fédération Tunisienne de Jiu-Jitsu</h1>
        <h2>Demande d'inscription refusée</h2>
        <p>Nous regrettons de vous informer que votre demande d'inscription a été <strong>refusée</strong>.</p>
        <p><strong>Motif du refus :</strong></p>
        <div style="background: #fff5f5; padding: 16px; border-radius: 8px; border: 1px solid #fc8181; margin: 16px 0;">
          <p>${reason}</p>
        </div>
        <p>Vous pouvez soumettre une nouvelle demande en corrigeant les éléments mentionnés ci-dessus.</p>
        <p>Cordialement,<br/>L'équipe FTJJ</p>
      </div>
    `;

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (error) {
      console.error("Échec d'envoi de l'email de refus:", error.message);
    }
  }

  async sendRegistrationApprovedEmail(to: string, personName: string, licenseType: string) {
    const subject = 'FTJJ - Votre demande de licence a été approuvée';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Fédération Tunisienne de Jiu-Jitsu</h1>
        <h2>Demande de licence approuvée</h2>
        <p>La demande de licence pour <strong>${personName}</strong> a été <strong>approuvée</strong>.</p>
        <p><strong>Type de licence :</strong> ${licenseType}</p>
        <p>La licence est maintenant active et peut être imprimée depuis votre espace club.</p>
        <p>Cordialement,<br/>L'équipe FTJJ</p>
      </div>
    `;

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (error) {
      console.error("Échec d'envoi de l'email d'approbation:", error.message);
    }
  }

  async sendRegistrationRejectedEmail(to: string, personName: string, reason: string) {
    const subject = 'FTJJ - Votre demande de licence a été refusée';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Fédération Tunisienne de Jiu-Jitsu</h1>
        <h2>Demande de licence refusée</h2>
        <p>La demande de licence pour <strong>${personName}</strong> a été <strong>refusée</strong>.</p>
        <p><strong>Motif :</strong> ${reason}</p>
        <p>Cordialement,<br/>L'équipe FTJJ</p>
      </div>
    `;

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (error) {
      console.error("Échec d'envoi de l'email de refus de licence:", error.message);
    }
  }
}
