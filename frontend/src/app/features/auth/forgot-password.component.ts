import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #f8fafc; padding: 1rem;
    }
    .auth-card {
      background: #fff; border-radius: 1.25rem; padding: 2.5rem 2rem;
      width: 100%; max-width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
      animation: fadeIn .4s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    .logo-box {
      width: 56px; height: 56px; border-radius: 14px;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem; box-shadow: 0 4px 12px rgba(5,150,105,.25);
      transition: transform .3s;
    }
    .logo-box:hover { transform: scale(1.05); }
    .auth-title { text-align:center; font-size:1.3rem; font-weight:700; color:#1e293b; margin-bottom:.25rem; }
    .auth-sub { text-align:center; font-size:.8rem; color:#94a3b8; margin-bottom:1.8rem; }
    .field-label { display:block; font-size:.75rem; font-weight:600; color:#475569; margin-bottom:.35rem; }
    .auth-input {
      width:100%; padding:.65rem .9rem; border:1.5px solid #e2e8f0; border-radius:.6rem;
      font-size:.88rem; color:#1e293b; background:#fff; outline:none;
      transition: border-color .2s, box-shadow .2s; box-sizing:border-box;
    }
    .auth-input::placeholder { color:#cbd5e1; }
    .auth-input:focus { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.1); }
    .auth-input.invalid { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.08); }
    .auth-btn {
      width:100%; padding:.7rem; background:#10b981; border:none; border-radius:.6rem;
      color:#fff; font-weight:600; font-size:.9rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:.45rem;
      transition: background .2s, transform .15s, box-shadow .2s;
    }
    .auth-btn:hover:not(:disabled) { background:#059669; box-shadow:0 4px 12px rgba(5,150,105,.25); transform:translateY(-1px); }
    .auth-btn:disabled { opacity:.55; cursor:not-allowed; }
    .error-box {
      display:flex; align-items:center; gap:.5rem;
      background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
      font-size:.82rem; border-radius:.5rem; padding:.6rem .9rem; margin-bottom:1rem;
      animation: shake .35s ease;
    }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
    .success-wrap {
      display:flex; flex-direction:column; align-items:center; gap:.8rem;
      text-align:center; padding:1rem 0; animation: fadeIn .4s ease;
    }
    .success-icon {
      width:60px; height:60px; border-radius:50%;
      background:linear-gradient(135deg,#10b981,#059669);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 16px rgba(16,185,129,.25);
      animation: pop .35s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes pop { 0%{transform:scale(.6);opacity:0} 80%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
    .success-title { font-size:1.1rem; font-weight:700; color:#1e293b; }
    .success-text { font-size:.82rem; color:#64748b; line-height:1.5; }
    .auth-link { color:#3b82f6; font-size:.78rem; font-weight:500; text-decoration:none; transition:color .2s; }
    .auth-link:hover { color:#1d4ed8; }
    .mini-spinner {
      width:16px; height:16px; border:2px solid rgba(255,255,255,.3);
      border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <ng-container *ngIf="!success; else successTpl">
          <div class="logo-box">
            <i class="fas fa-key" style="color:#fff;font-size:1.3rem"></i>
          </div>
          <h1 class="auth-title">Mot de passe oublié</h1>
          <p class="auth-sub">Saisissez votre email pour recevoir un lien de réinitialisation</p>

          <div *ngIf="error" class="error-box">
            <i class="fas fa-exclamation-circle"></i> {{error}}
          </div>

          <div style="margin-bottom:1.5rem">
            <label class="field-label">Adresse email</label>
            <input type="email"
              [class]="'auth-input' + (submitted && !email ? ' invalid' : '')"
              [(ngModel)]="email" placeholder="exemple@univ.ci" (keyup.enter)="onSubmit()">
          </div>

          <button class="auth-btn" (click)="onSubmit()" [disabled]="loading">
            <div *ngIf="loading" class="mini-spinner"></div>
            <ng-container *ngIf="!loading"><i class="fas fa-paper-plane"></i> Envoyer le lien</ng-container>
          </button>

          <div style="text-align:center;margin-top:1.2rem">
            <a routerLink="/login" class="auth-link"><i class="fas fa-arrow-left" style="font-size:.7rem"></i> Retour à la connexion</a>
          </div>
        </ng-container>

        <ng-template #successTpl>
          <div class="success-wrap">
            <div class="success-icon">
              <i class="fas fa-check" style="color:#fff;font-size:1.5rem"></i>
            </div>
            <p class="success-title">Email envoyé !</p>
            <p class="success-text">{{success}}<br>Vérifiez votre boîte de réception.</p>
            <a routerLink="/login" class="auth-link" style="margin-top:.3rem">
              <i class="fas fa-arrow-left" style="font-size:.7rem"></i> Retour à la connexion
            </a>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  email = '';
  error = '';
  success = '';
  loading = false;
  submitted = false;

  constructor(private auth: AuthService) {}

  onSubmit() {
    this.submitted = true;
    if (!this.email) return;
    this.loading = true;
    this.error = '';
    this.success = '';

    this.auth.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = res.message || 'Un email a été envoyé.';
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.error || err.error?.message || "Erreur lors de l'envoi de l'email";
      }
    });
  }
}
